// Pure helpers for the message thread. No JSX, no fetch (CLAUDE.md).

// Identity comes from GET /api/users/me (BACKEND.md) and is compared as an
// exact id, never inferred from senderUsername/otherUsername — two users
// could share a display name, and a username comparison would silently
// mislabel a message the day that happens.
export function isOwnMessage(message, currentUserId) {
  return message.senderId === currentUserId
}

// Appends only ids from `incoming` that aren't already in `existing`,
// preserving `existing`'s order and appending new ones in `incoming`'s
// order. Never replaces, never re-sorts: history arrives in the server's
// ascending order and this keeps it that way across refetches, and (from
// Step 7 on) across live frames appended after it.
export function mergeById(existing, incoming) {
  const seenIds = new Set(existing.map((message) => message.id))
  const additions = incoming.filter((message) => !seenIds.has(message.id))
  return [...existing, ...additions]
}
