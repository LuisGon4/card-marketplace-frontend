import { useSearchParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'

// Sort control (plan §5 Step 9). Fixed options, and — deliberately — each
// value carries the Spring-style direction suffix rather than a bare field
// name. BACKEND.md §1 ("sort" row): "Optional direction suffix ,asc/,desc
// ... only the field is validated" — so `createdAt,desc` and `askingPrice,desc`
// are both legal requests, and Step 8 already shipped `createdAt,desc` as the
// fixed default. Keeping the suffix here keeps the "Newest first" default
// consistent with Step 8, and lets the two `askingPrice` options share a field
// while differing only in direction. Do not "simplify" this back to a bare
// field name.
const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'askingPrice,asc', label: 'Price: low to high' },
  { value: 'askingPrice,desc', label: 'Price: high to low' },
]
const DEFAULT_SORT = SORT_OPTIONS[0].value
const VALID_SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

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

// Same untrusted-input treatment for `sort`: anything outside the two fixed
// options falls back to the default rather than reaching the API, where an
// unrecognized field would 400 (BACKEND.md §1).
function clampSort(rawSort) {
  return VALID_SORT_VALUES.has(rawSort) ? rawSort : DEFAULT_SORT
}

function summaryText(page, totalPages, totalElements) {
  const listingWord = totalElements === 1 ? 'listing' : 'listings'
  // Guard: an empty result set has totalPages === 0, so "Page 1 of 0" would
  // be nonsense — omit the page fragment rather than render it (plan §4).
  if (totalPages === 0) return `${totalElements} ${listingWord}`
  return `Showing page ${page + 1} of ${totalPages} · ${totalElements} ${listingWord}`
}

function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Untrusted URL input, clamped on every read. Never rewritten back into
  // the address bar — `?page=-3&sort=bogus` must render page 0, newest-first,
  // without ever touching history.
  const page = clampPage(searchParams.get('page'))
  const sort = clampSort(searchParams.get('sort'))

  const path = (() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', '20')
    params.set('sort', sort)
    return `/api/listings?${params.toString()}`
  })()

  const { data, loading, error, refetch } = useFetch(path)

  // content is documented as never null (BACKEND.md), but a loading/error
  // response has no data at all yet — guard with the empty-array fallback.
  const listings = data?.content ?? []
  const loaded = !loading && !error && data !== null
  const isEmpty = loaded && listings.length === 0
  // Forward availability comes from the response's own `hasNext` only — never
  // derived from `totalPages` (plan §4 `PageResponse` handling).
  const hasNext = data?.hasNext ?? false

  function goToPage(nextPage) {
    // Push a history entry per change (Luis's decision — no `{ replace: true }`)
    // so the back button steps back through pages. Preserve any other params
    // (e.g. future filters) via the functional updater.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(nextPage))
      return next
    })
  }

  function handleSortChange(event) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('sort', event.target.value)
      // Changing sort resets to page 0 — a stale page number from the old
      // sort order would otherwise point at unrelated results.
      next.set('page', '0')
      return next
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>

      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm text-zinc-700">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={handleSortChange}
          className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Single live region for the whole page (plan §3 a11y) — loading text
          and the results summary share it so paging/refresh announces once,
          not twice. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listings…</p>}
        {loaded && (
          <p className="text-sm text-zinc-600">
            {summaryText(page, data.totalPages, data.totalElements)}
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="space-y-3 border border-red-300 bg-red-50 p-4">
          {/* Server's plain-text message, rendered verbatim — never rewritten
              or paraphrased (CLAUDE.md "API access"). */}
          <p className="text-sm text-zinc-900">{error.message}</p>
          <button
            type="button"
            onClick={refetch}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="space-y-3 border border-dashed border-zinc-300 p-8 text-center">
          <div className="space-y-1">
            <h2 className="text-base font-medium text-zinc-900">No listings yet</h2>
            <p className="text-sm text-zinc-600">
              {page > 0
                ? 'There are no listings on this page.'
                : "When sellers post cards, they'll appear here."}
            </p>
          </div>
          {/* A legitimately empty page N (e.g. the catalogue shrank after
              this page was bookmarked) is a different situation from an
              empty catalogue at page 0 — offer a way back (plan §3). */}
          {page > 0 && (
            <button
              type="button"
              onClick={() => goToPage(0)}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Back to first page
            </button>
          )}
        </div>
      )}

      {loaded && listings.length > 0 && (
        // auto-rows-fr equalises every row, so cards match across rows too,
        // not just within one. Each ListingCard is h-full to fill its cell.
        <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard {...listing} />
            </li>
          ))}
        </ul>
      )}

      {/* Chrome, not a fifth state: rendered unconditionally alongside the
          four blocks above so the control row never appears/disappears or
          jumps as loading/error/empty/populated toggle. `page` is always
          known from the URL; `totalPages` is only known once a response has
          landed, so it falls back to an em dash rather than changing the
          template's shape. */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => goToPage(page - 1)}
          className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-zinc-700">
          {/* Same guard as summaryText's: totalPages === 0 (empty catalogue)
              is a real number, not a missing one, and "Page 1 of 0" is just
              as nonsensical here as it is there — fall back to the em dash
              for "unknown" and "zero" alike. */}
          Page {page + 1} of {data?.totalPages ? data.totalPages : '—'}
        </span>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => goToPage(page + 1)}
          className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default BrowsePage
