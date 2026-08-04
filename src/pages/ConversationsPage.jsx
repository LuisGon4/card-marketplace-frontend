import { useRef } from 'react'
import { useFetch } from '../hooks/useFetch'
import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import SecondaryButton from '../components/SecondaryButton'
import { sortConversations } from '../helpers/messaging/conversations'
import {
  emptyConversationsCopy,
  signedOutConversationsCopy,
  startedLine,
} from '../helpers/messaging/copy'

// One row per ConversationResponse (BACKEND.md). No unread count, no
// last-message preview, no last-activity time — those fields are absent
// from the payload, not omitted here; do not add them by guessing.
function ConversationRow({ id, cardName, otherUsername, createdAt }) {
  return (
    <li className="rounded border border-zinc-200 p-4">
      <h2 className="text-base font-medium text-zinc-900">
        <TextLink to={`/conversations/${id}`}>{cardName}</TextLink>
      </h2>
      <p className="text-sm text-zinc-700">with {otherUsername}</p>
      <p className="text-sm text-zinc-600">{startedLine(createdAt)}</p>
    </li>
  )
}

function ConversationsPage({ authStatus }) {
  const headingRef = useRef(null)
  const isSignedIn = authStatus === 'signedIn'

  // useFetch already accepts null and clears on the way down — skips the
  // request while signed out or still checking.
  const { data, error, refetch } = useFetch(isSignedIn ? '/api/conversations' : null)

  // Deliberately does not consult `loading`: the page's states are derived
  // from what it *has* (data/error), not from what the hook is *doing*.
  // Today loading===true always coincides with data===null (useFetch sets
  // both in the same batch), so adding `!loading` here would be a no-op —
  // but it would also make `loaded` depend on that coincidence. If useFetch
  // ever kept stale data across a refetch (a natural "don't flash the list"
  // change), a `!loading` guard here would blank the list on every refetch
  // instead of leaving the old one up. Don't add it back as a "safety check".
  const loaded = isSignedIn && !error && data !== null
  const conversations = loaded ? sortConversations(data) : []
  const isEmpty = loaded && conversations.length === 0
  // "Checking…" folds into the same loading text as the fetch itself —
  // there is nothing meaningful to show until authStatus resolves.
  //
  // Keyed on `data === null`, not `loading`: the render where authStatus
  // flips 'checking' -> 'signedIn' commits before useFetch's effect has run
  // for the new path, so `loading` is still false from the `null`-path
  // render that just ended. `data` is null for that entire render too, so
  // this keeps the loading text up instead of leaving a one-commit gap
  // where nothing renders. Do not "simplify" this back to `loading`.
  const showLoading = authStatus === 'checking' || (isSignedIn && data === null && !error)

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>Conversations</PageHeading>

      <div role="status" aria-live="polite">
        {showLoading && <p className="text-sm text-zinc-600">Loading conversations…</p>}
      </div>

      {/* Rendered whenever there's something to refresh, and never unmounted
          across the loading/error/empty/populated states, so focus stays on
          it after a click. There is no topic for "my conversations" — a
          conversation someone else opens with you is invisible until a
          refetch. */}
      {isSignedIn && <SecondaryButton onClick={refetch}>Refresh</SecondaryButton>}

      {isSignedIn && error && (
        <ErrorNotice
          message={error.message}
          onRetry={() => {
            refetch()
            focusPageHeading()
          }}
        />
      )}

      {/* The header owns the only Sign in control (CLAUDE.md's auth
          boundary) — this points at it rather than rendering one. */}
      {authStatus === 'signedOut' && (
        <EmptyState
          heading={signedOutConversationsCopy.heading}
          body={signedOutConversationsCopy.body}
        />
      )}

      {isEmpty && (
        <EmptyState heading={emptyConversationsCopy.heading} body={emptyConversationsCopy.body} />
      )}

      {loaded && conversations.length > 0 && (
        <ul className="space-y-3">
          {conversations.map((conversation) => (
            <ConversationRow key={conversation.id} {...conversation} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default ConversationsPage
