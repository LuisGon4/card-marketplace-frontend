// Alt text for the main detail image. A listing with one image or fewer gets
// the bare card name — no "image 1 of 1" — since a position count is only
// informative once there's more than one position to be in. `total <= 1`
// (not `=== 1`) so a caller computing this before it knows whether an image
// will render — an empty list, `total === 0` — doesn't get the nonsense
// "image 1 of 0".
export function imageAlt(cardName, index, total) {
  if (total <= 1) return cardName
  return `${cardName}, image ${index + 1} of ${total}`
}

// Accessible name for a thumbnail strip button. Same 1-based numbering rule
// as imageAlt, kept beside it: if the two drift, a button announcing
// "Show image 3 of 5" would swap in an image whose alt says "image 4 of 5".
export function thumbnailLabel(index, total) {
  return `Show image ${index + 1} of ${total}`
}
