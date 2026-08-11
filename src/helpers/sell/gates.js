// Two gates over the same listing, and deliberately two functions rather
// than one. Both answer "is this listing active and mine?", and today they
// always agree — but each refuses for a reason the other doesn't share, so
// they can diverge independently:
//   - editGate is Luis's product rule. The server accepts the PATCH on an
//     inactive listing regardless (measured: a 200), so this gate only
//     moves if Luis lifts the rule.
//   - canAddPhotos reflects the backend's contract: the presign and image
//     endpoints both answer 409 on an inactive listing. This gate only
//     moves if the backend starts permitting that.
// Collapsing them into one function (or into a shared isActiveListing(listing)
// predicate they both call) would make either change above a one-line edit
// that silently mis-gates the other link — and the diff would look correct,
// because nothing here is a copied rule. isActive is a plain boolean field;
// reading it twice is a field read, not duplication. Do not add that helper.
//
// The shapes are asymmetric on purpose: editGate returns a keyed reason
// because three consumers share its definition (this row's link, the edit
// page's branch, and editGateMessage's wording in copy.js); canAddPhotos
// returns a boolean because it has exactly one consumer and no message to
// supply — ListingImagesPage is untouched this cycle and gains no block
// state. Don't give canAddPhotos a reason table to match editGate; that
// would invent consumers it doesn't have.

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

// Contract rule: POST .../images/presign and POST .../images both answer
// 409 on an inactive listing (BACKEND.md, Images) — a link on an inactive
// row leads to a guaranteed failure. Not a product decision, and not
// editGate above: either can change without the other.
export function canAddPhotos(listing) {
  return Boolean(listing?.isActive)
}
