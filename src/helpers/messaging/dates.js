// Timestamp formatting for messaging. Stays here, not lib/: the promotion
// rule needs a second consumer outside this feature, and no other feature
// renders a timestamp today.

// Built once at module load, matching formatPrice in lib/listings.js — this
// renders once per conversation row, across every row in the list.
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

// `createdAt` is UTC-explicit with a trailing Z (BACKEND.md), so Date
// parses it correctly and Intl renders it in the viewer's zone. Falls back
// to the raw string on an unparseable value rather than "Invalid Date" —
// same spirit as printingLabel's fallback in lib/listings.js.
export function formatDateTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return dateTimeFormatter.format(date)
}
