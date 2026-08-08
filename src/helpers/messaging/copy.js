// Copy the user reads on the conversations list. Kept out of JSX so this
// file is the single source of truth for each case (CLAUDE.md).

import { formatDateTime } from './dates'

export const emptyConversationsCopy = {
  heading: 'No conversations yet',
  body: 'Open a listing and use "Message seller" to start one.',
}

export const signedOutConversationsCopy = {
  heading: 'Sign in to see your conversations',
  body: 'Use Sign in at the top of the page to view messages with sellers and buyers.',
}

export function startedLine(createdAt) {
  return `Started ${formatDateTime(createdAt)}`
}

// Copy for the thread page (/conversations/:id).

export const emptyMessagesCopy = {
  heading: 'No messages yet',
  body: 'Nothing has been sent in this conversation.',
}

// Both fetches succeeded (200), but the id isn't in the caller's own
// conversation list. Not an error — a distinct, honest notice.
export const notInConversationListCopy = {
  heading: "This conversation isn't in your list",
  body: "It may not exist, or you may not be a participant. Go back to conversations to see the ones you're part of.",
}

export const signedOutThreadCopy = {
  heading: 'Sign in to view this conversation',
  body: 'Use Sign in at the top of the page to view its messages.',
}

export function threadSubline(otherUsername, createdAt) {
  return `Conversation with ${otherUsername} · ${startedLine(createdAt)}`
}

export function messageAuthorLabel(isOwn, senderUsername) {
  return isOwn ? 'You' : senderUsername
}

// The socket status line. `error` is the broker's own text (lock #10) —
// shown verbatim instead of a generic "disconnected" string, so a session
// expiring mid-thread is legible rather than a silent reconnect loop.
export function connectionStatusText(status, error) {
  if (status === 'connecting') return 'Connecting…'
  if (status === 'connected') return 'Connected'
  if (status === 'disconnected') return error ?? 'Disconnected. Reconnecting…'
  return null
}

// Copy for the listing detail action row (ListingDetailPage): the
// signed-out hint and the own-listing line that stand in for the
// "Message seller" button in those two states.

export const messageSellerSignedOutCopy = 'Sign in to message the seller.'

export const ownListingCopy = 'This is your listing.'

// Copy for MessageComposer.

export const composerHint = 'Enter to send, Shift+Enter for a new line'
