import { CONDITION_VALUES, PRINTING_VALUES, readPrice } from '../../lib/listings'

// Fixed sort options. Each value deliberately carries the Spring-style
// direction suffix rather than a bare field name — BACKEND.md §1 ("sort"
// row): "Optional direction suffix ,asc/,desc ... only the field is
// validated" — so `createdAt,desc` and `askingPrice,desc` are both legal
// requests, and `createdAt,desc` is the fixed default here, letting the two
// `askingPrice` options share a field while differing only in direction. Do
// not "simplify" this back to a bare field name. Passed to FilterBar as a
// prop rather than duplicated there — don't add a second copy.
export const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'askingPrice,asc', label: 'Price: low to high' },
  { value: 'askingPrice,desc', label: 'Price: high to low' },
]
const DEFAULT_SORT = SORT_OPTIONS[0].value
const VALID_SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

// The single definition of which params count as a filter. The request loop
// iterates this so no filter can be special-cased by accident.
export const FILTER_KEYS = ['cardName', 'condition', 'printing', 'minPrice', 'maxPrice']

// Whether any of the five filters is active. One definition shared by the
// empty-state table, BrowsePage's action buttons, and FilterBar's own
// Clear-all button — all three were asking the same question.
export function hasAnyFilter(committed) {
  return FILTER_KEYS.some((key) => committed[key] !== '')
}

// Read + clamp the URL's `page` param. The URL is untrusted input (a human
// can hand-edit it), so an invalid value is treated as page 0 rather than
// sent to the API — clamping happens here, on read, and the address bar is
// never rewritten to "correct" it.
function clampPage(rawPage) {
  const parsed = Number.parseInt(rawPage, 10)
  // Number.isSafeInteger, not Number.isFinite: a huge digit string parses to
  // a finite-but-non-integral float (Number.parseInt('999...999', 10) is
  // 1e+30, and Number.isFinite(1e30) is true), and String(1e30) stringifies
  // as "1e+30" — an invalid, non-integer `page` value that would still reach
  // the API. isSafeInteger rejects that the same way it rejects everything
  // else out of range, falling back to 0.
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return parsed
}

// Same untrusted-input treatment for `sort`: anything outside SORT_OPTIONS
// falls back to the default rather than reaching the API, where an
// unrecognized field would 400 (BACKEND.md §1).
function clampSort(rawSort) {
  return VALID_SORT_VALUES.has(rawSort) ? rawSort : DEFAULT_SORT
}

// Same clamp-on-read treatment as clampPage / clampSort. Kept as a named
// helper even with one call site: it names the trim-on-read rule that
// FilterBar's trim-on-write mirrors, and keeps cardName from becoming the
// one URL param read by inline code in an otherwise uniform table of
// readers.
function readTrimmed(searchParams, key) {
  return (searchParams.get(key) ?? '').trim()
}

// Clamped case-sensitively on purpose: `?condition=nm` clamps to '', not
// 'NM' — do not add a `.toUpperCase()` to "help" it match.
function clampEnum(raw, validValues) {
  return validValues.has(raw) ? raw : ''
}

export function readBrowseParams(searchParams) {
  const page = clampPage(searchParams.get('page'))
  const sort = clampSort(searchParams.get('sort'))
  const cardName = readTrimmed(searchParams, 'cardName')
  const condition = clampEnum(searchParams.get('condition'), CONDITION_VALUES)
  const printing = clampEnum(searchParams.get('printing'), PRINTING_VALUES)
  const minPrice = readPrice(searchParams.get('minPrice'))
  const maxPrice = readPrice(searchParams.get('maxPrice'))
  // All five filters, collapsed to one object — the request loop, the
  // summary, and the empty-state table all key off this rather than five
  // separate parameters.
  const committed = { cardName, condition, printing, minPrice, maxPrice }
  return { page, sort, committed }
}

export function withPage(params, page) {
  const next = new URLSearchParams(params)
  next.set('page', String(page))
  return next
}

// Changing sort resets to page 0 — a stale page number from the old sort
// order would otherwise point at unrelated results.
export function withSort(params, sortValue) {
  const next = new URLSearchParams(params)
  next.set('sort', sortValue)
  next.set('page', '0')
  return next
}

// Deletes every filter key, not just cardName, and never touches sort.
export function withoutFilters(params) {
  const next = new URLSearchParams(params)
  for (const key of FILTER_KEYS) {
    next.delete(key)
  }
  next.set('page', '0')
  return next
}

export function withFilters(params, next) {
  const built = new URLSearchParams(params)
  for (const key of FILTER_KEYS) {
    if (next[key] === '') {
      built.delete(key)
    } else {
      built.set(key, next[key])
    }
  }
  built.set('page', '0')
  return built
}
