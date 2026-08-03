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

// D5: both fetches succeeded (200), but the id isn't in the caller's own
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
