// Shared domain vocabulary for listings: enum options/values, labels, and
// price formatting. Lives outside any component because reactRefresh's
// allowConstantExport doesn't cover a function declaration or a
// `new Intl.NumberFormat(...)` initializer, so exporting these from
// ListingCard.jsx would not be lint-clean.

export const CONDITION_OPTIONS = [
  { value: 'NM', label: 'NM — Near Mint' },
  { value: 'LP', label: 'LP — Lightly Played' },
  { value: 'MP', label: 'MP — Moderately Played' },
  { value: 'HP', label: 'HP — Heavily Played' },
  { value: 'DMG', label: 'DMG — Damaged' },
]

export const PRINTING_OPTIONS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HOLOFOIL', label: 'Holofoil' },
  { value: 'REVERSE_HOLOFOIL', label: 'Reverse holofoil' },
]

export const CONDITION_VALUES = new Set(CONDITION_OPTIONS.map((option) => option.value))
export const PRINTING_VALUES = new Set(PRINTING_OPTIONS.map((option) => option.value))

export const PRINTING_LABELS = Object.fromEntries(
  PRINTING_OPTIONS.map((option) => [option.value, option.label]),
)

// The `?? printing` fallback matters: drop it and an enum value the backend
// adds later renders as `undefined` the moment it appears, instead of the
// raw string.
export function printingLabel(printing) {
  return PRINTING_LABELS[printing] ?? printing
}

// No currency field exists on the wire — BACKEND.md documents USD as a
// property of the deployment, not the payload — so 'USD' below is not
// read from any response and can't be swapped for a per-listing value.
// Built once at module load rather than per call: this renders twice per
// card across a grid of 20, and again on every sort or page change.
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatPrice(value) {
  return currencyFormatter.format(value)
}
