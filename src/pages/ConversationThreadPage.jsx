import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { useChatSocket } from '../hooks/useChatSocket'
import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import MessageList from '../components/MessageList'
import MessageComposer from '../components/MessageComposer'
import { findConversation } from '../helpers/messaging/conversations'
import { mergeById } from '../helpers/messaging/messages'
import {
  connectionStatusText,
  emptyMessagesCopy,
  notInConversationListCopy,
  signedOutThreadCopy,
  threadSubline,
} from '../helpers/messaging/copy'

function ConversationThreadPage({ authStatus, user }) {
  const { id } = useParams()
  const headingRef = useRef(null)
  const isSignedIn = authStatus === 'signedIn'

  // There is no GET /api/conversations/{id} (BACKEND.md) — cardName,
  // otherUsername, and listingId for the heading exist only on the list
  // entry, so the thread page fetches the list and finds itself in it.
  const {
    data: conversations,
    error: conversationsError,
    refetch: refetchConversations,
  } = useFetch(isSignedIn ? '/api/conversations' : null)

  // useParams() returns id already URL-decoded; re-encoding here is what
  // keeps it scoped to a single path segment instead of restructuring the
  // request URL.
  const {
    data: history,
    error: messagesError,
    refetch: refetchMessages,
  } = useFetch(isSignedIn ? `/api/conversations/${encodeURIComponent(id)}/messages` : null)

  const [messages, setMessages] = useState([])

  // Live frames that arrive before `history` has resolved even once. The
  // socket activates as soon as the conversation is found in the list —
  // independent of, and often before, the history fetch settling — so a
  // frame can exist only in the subscription, never in the snapshot the
  // server later returns. Dropping it would lose a message; merging it
  // immediately would let mergeById (which only ever appends) put it above
  // the entire history once that lands. Buffering and flushing it *after*
  // the first history merge holds both invariants: history is always
  // ordered before any live frame, and no frame is ever dropped.
  //
  // Deliberately a ref, not the historyLoadedOnce state below: the flip has
  // to be synchronous with the merge effect's own body (so a live frame
  // arriving in the same tick sees the post-flip value) and with
  // handleLiveMessage's read (called from outside React's render cycle, off
  // a WS callback). Routing that decision through state would add a render
  // in between — a frame arriving in that gap would land in the buffer and
  // then wait for the *next* history refetch to be flushed, which may not
  // come soon. historyLoadedOnce (state) exists only so the render below has
  // something to read; it is set from the same spot this ref flips, never
  // read to make a buffering decision itself.
  const historyLoadedOnceRef = useRef(false)
  const pendingLiveFramesRef = useRef([])

  // React Router does not remount this component when only :id changes, so
  // navigating from one thread to another would otherwise reuse `messages` —
  // both conversations rendered under a heading naming only the new one.
  //
  // Guarded adjust-during-render sync (same pattern as FilterBar's
  // reconciledSignature): reset happens before this render commits, so the
  // old thread's messages are never painted under the new thread's URL, not
  // even for one frame. A useEffect would paint that stale frame first and
  // correct it a tick later — the documented anti-pattern. The `if` is what
  // keeps this lint-clean under react-hooks/set-state-in-render, which only
  // flags *unconditional* setState-in-render. Do not delete this as
  // "redundant" — the component is not remounting, so nothing else clears
  // `messages` for you.
  const [renderedId, setRenderedId] = useState(id)
  // Mirrors historyLoadedOnceRef below, but as state: messagesLoaded/loaded
  // read it during render, and per the same rule as `messages` above, a
  // value read synchronously during paint must reset in this render-phase
  // block, not a tick later in an effect — otherwise, for one render, the
  // old thread's "history has loaded" would combine with the new thread's
  // already-cleared `messages`, and the page would flash "loaded" for
  // history it hasn't actually fetched yet.
  const [historyLoadedOnce, setHistoryLoadedOnce] = useState(false)
  if (renderedId !== id) {
    setRenderedId(id)
    setMessages([])
    setHistoryLoadedOnce(false)
  }

  // The buffer above resets in its own effect rather than in the render-time
  // block: react-hooks/refs forbids writing a ref's `current` during render,
  // and unlike `messages`, nothing reads these refs synchronously during
  // paint — an effect a tick later is soon enough. This still runs before
  // the merge-history effect below ever sees the new id's real data, so
  // thread B never flushes thread A's leftover frames.
  useEffect(() => {
    historyLoadedOnceRef.current = false
    pendingLiveFramesRef.current = []
  }, [id])

  // History is merged into local state rather than rendered from useFetch's
  // `data` directly: useFetch sets `data` back to null at the start of every
  // request, so rendering it straight would blank the transcript — and,
  // since the list below is a live region, re-announce the entire history —
  // on every refetch. mergeById never replaces or re-sorts, so the server's
  // ascending order survives.
  // Syncing local state to a prop-like input (the latest fetched history),
  // not an accidental render cascade — see useFetch.js for the same case.
  useEffect(() => {
    if (history === null) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMessages((existing) => mergeById(existing, history))

    if (!historyLoadedOnceRef.current) {
      historyLoadedOnceRef.current = true
      setHistoryLoadedOnce(true)
      const buffered = pendingLiveFramesRef.current
      pendingLiveFramesRef.current = []
      if (buffered.length > 0) {
        // A second, separate update: React applies updater functions in the
        // order they were called, so this always lands after the merge
        // above — buffered frames append behind history, never in front of it.
        setMessages((existing) => mergeById(existing, buffered))
      }
    }
  }, [history])

  // Passed to useChatSocket, which reads it through a ref rather than a
  // dependency — see that hook for why. Buffer until history has resolved
  // once for *this* id; the reset block above clears the buffer on every id
  // change, so thread B never flushes thread A's leftover frames.
  const handleLiveMessage = useCallback((message) => {
    if (!historyLoadedOnceRef.current) {
      pendingLiveFramesRef.current.push(message)
      return
    }
    setMessages((existing) => mergeById(existing, [message]))
  }, [])

  // In practice a non-participant conversation 403s on the messages fetch
  // before this ever needs to decide, but the check is independent: it only
  // means "both requests came back 200 and the id still isn't in the list".
  const error = messagesError ?? conversationsError
  const conversationsLoaded = isSignedIn && !conversationsError && conversations !== null
  // historyLoadedOnce, not `history !== null`: useFetch nulls `history` at
  // the start of every request, including the reconnect/first-connect
  // refetch below (D8). Gating on the raw value would flip this false for
  // the duration of that refetch and unmount the composer, revert the
  // heading to its placeholder, and re-show the empty state — all while a
  // transcript is already on screen. Once history has loaded for this id,
  // a transient refetch no longer un-loads the page.
  const messagesLoaded = isSignedIn && !messagesError && historyLoadedOnce
  const conversation = conversationsLoaded ? findConversation(conversations, id) : null
  // A non-empty transcript is proof of participation — the messages fetch
  // only 200s with real content for a participant — so it overrides a
  // stale-list race (most plausibly right after "Message seller" creates a
  // conversation the list fetch hasn't caught up to yet). Without this
  // clause the notice's "you may not be a participant" copy would render
  // directly above the messages that disprove it.
  const notInList =
    conversationsLoaded && messagesLoaded && conversation === null && messages.length === 0
  const loaded = conversationsLoaded && messagesLoaded && conversation !== null

  // Mirrors ConversationsPage's showLoading: keyed on conversationsLoaded /
  // messagesLoaded rather than the hooks' own `loading`, because the render
  // where authStatus flips 'checking' -> 'signedIn' commits before either
  // useFetch's effect has run for its new path — `loading` would still read
  // false from the just-ended `null`-path render. Both `data`s are null for
  // that whole render too, so gating on "not yet loaded" here keeps the
  // loading text up instead of leaving a one-commit gap where nothing
  // renders. Do not "simplify" this back to the hooks' `loading` flags.
  // messagesLoaded no longer flips false on a reconnect refetch (see its
  // definition above), so `messages.length === 0` is no longer load-bearing
  // for that race — it stays as a second, independent reason "there's
  // nothing to show yet" can be true, for a genuinely empty conversation.
  const showLoading =
    authStatus === 'checking' ||
    (isSignedIn && !error && !(conversationsLoaded && messagesLoaded) && messages.length === 0)

  // No connection for a 403, a 404, or a non-UUID: the socket only activates
  // once the id has actually resolved to a conversation the caller is
  // (apparently) part of, so a WebSocket outage degrades a healthy REST API
  // to "history, no live updates" instead of a blank page — and no STOMP
  // destination is ever built from an unvalidated path segment.
  const socketEnabled = conversationsLoaded && conversation !== null
  const {
    status: connectionStatus,
    error: connectionError,
    connectionEpoch,
    sendMessage,
  } = useChatSocket(id, { enabled: socketEnabled, onMessage: handleLiveMessage })

  // Refetches history on every transition into 'connected', including the
  // first: this closes the race between the history snapshot and the
  // subscription taking effect, and the gap of messages sent while the
  // socket was down. The first connect's refetch duplicates the initial
  // useFetch call — mergeById makes that a no-op — which is accepted so the
  // effect has no special case to get wrong for its own first value.
  useEffect(() => {
    if (connectionEpoch === 0) return
    refetchMessages()
  }, [connectionEpoch, refetchMessages])

  const connectionText = connectionStatusText(connectionStatus, connectionError)

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  function retry() {
    refetchConversations()
    refetchMessages()
    focusPageHeading()
  }

  return (
    <div className="space-y-6">
      <TextLink to="/conversations">Back to conversations</TextLink>

      <div>
        {/* Placeholder text keeps the <h1> present during loading and error
            — a heading that only sometimes exists breaks the page outline. */}
        <PageHeading ref={headingRef}>
          {loaded ? (
            <TextLink to={`/listings/${conversation.listingId}`}>{conversation.cardName}</TextLink>
          ) : (
            'Conversation'
          )}
        </PageHeading>
        {loaded && (
          <p className="text-sm text-zinc-600">
            {threadSubline(conversation.otherUsername, conversation.createdAt)}
          </p>
        )}
      </div>

      <div role="status" aria-live="polite">
        {showLoading && <p className="text-sm text-zinc-600">Loading messages…</p>}
        {connectionText && <p className="text-sm text-zinc-600">{connectionText}</p>}
      </div>

      {isSignedIn && error && <ErrorNotice message={error.message} onRetry={retry} />}

      {/* The header owns the only Sign in control (CLAUDE.md's auth
          boundary) — this points at it rather than rendering one. */}
      {authStatus === 'signedOut' && (
        <EmptyState heading={signedOutThreadCopy.heading} body={signedOutThreadCopy.body} />
      )}

      {notInList && (
        <EmptyState
          heading={notInConversationListCopy.heading}
          body={notInConversationListCopy.body}
        />
      )}

      {loaded && messages.length === 0 && (
        <EmptyState heading={emptyMessagesCopy.heading} body={emptyMessagesCopy.body} />
      )}

      <MessageList messages={messages} currentUserId={user?.id} />

      {/* No composer on an error, a 403, or a not-in-list page — those
          states have nothing to send a message into. */}
      {loaded && <MessageComposer connected={connectionStatus === 'connected'} onSend={sendMessage} />}
    </div>
  )
}

export default ConversationThreadPage
