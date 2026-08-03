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
