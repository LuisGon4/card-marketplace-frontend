import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import MessageList from '../components/MessageList'
import { findConversation } from '../helpers/messaging/conversations'
import { mergeById } from '../helpers/messaging/messages'
import {
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

  // React Router does not remount this component when only :id changes, so
  // navigating from one thread to another would otherwise reuse `messages`
  // and mergeById would append the new thread's history onto the old one's —
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
  if (renderedId !== id) {
    setRenderedId(id)
    setMessages([])
  }

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
  }, [history])

  // In practice a non-participant conversation 403s on the messages fetch
  // before this ever needs to decide, but the check is independent: it only
  // means "both requests came back 200 and the id still isn't in the list".
  const error = messagesError ?? conversationsError
  const conversationsLoaded = isSignedIn && !conversationsError && conversations !== null
  const messagesLoaded = isSignedIn && !messagesError && history !== null
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
  const showLoading =
    authStatus === 'checking' ||
    (isSignedIn && !error && !(conversationsLoaded && messagesLoaded))

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
    </div>
  )
}

export default ConversationThreadPage
