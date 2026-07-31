// Alt text for the main detail image. A listing with exactly one image gets
// the bare card name — no "image 1 of 1" — since a position count is only
// informative once there's more than one position to be in.
export function imageAlt(cardName, index, total) {
  if (total === 1) return cardName
  return `${cardName}, image ${index + 1} of ${total}`
}
