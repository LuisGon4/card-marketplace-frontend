// Product rule (Luis, 2026-08-09): a listing must be reactivated before it
// can be edited. The server accepts a PATCH on an inactive listing — this
// gate is not derived from what the API allows. Do not merge with
// canAddPhotos below: it refuses for an unrelated reason.
//
// Ordered: membership before status, so a listing that is neither yours nor
// active reports 'notYours' — the fact the user can act on.
export function editGate(listing) {
  if (!listing) return 'notYours'
  if (!listing.isActive) return 'inactive'
  return null
}
