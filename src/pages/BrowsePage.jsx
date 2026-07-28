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

// Read + clamp `cardName` the same way: the URL is untrusted input, and
// absent / empty / whitespace-only all collapse to '' = "no search". Clamped
// on read only — the address bar is never rewritten (plan §4).
function readCardName(searchParams) {
  return (searchParams.get('cardName') ?? '').trim()
}

// The single source of truth for the §3.4 heading/body 2×2 (page > 0 ×
// search active) — stated once here rather than re-derived separately by
// the heading, the body, and the action buttons, which is what let "No
// listings yet" slip through on a search miss in the first place.
function emptyStateCopy(page, cardName) {
  const hasSearch = cardName !== ''
  // `page > 0` takes heading precedence over an active search: "you're past
  // the end" is the more actionable fact regardless of whether the query is
  // fine (plan §3.4).
  if (page > 0) {
    return {
      heading: 'Nothing on this page',
      body: hasSearch
        ? `No more results for “${cardName}” past this page.`
        : 'This page is past the end of the results.',
    }
  }
  if (hasSearch) {
    return {
      heading: `No listings match “${cardName}”`,
      body: 'Check the spelling, or search a shorter part of the name.',
    }
  }
  return {
    heading: 'No listings yet',
    body: "When sellers post cards, they'll appear here.",
  }
}

function summaryText(page, totalPages, totalElements, cardName) {
  const listingWord = totalElements === 1 ? 'listing' : 'listings'
  // The search query is echoed into the announcement itself (plan §3.7):
  // this line lives in the page's only live region, so it's the only
  // confirmation a screen-reader user gets that their search was applied.
  const querySuffix = cardName ? ` matching “${cardName}”` : ''
  // Guard: an empty result set has totalPages === 0, so "Page 1 of 0" would
  // be nonsense — omit the page fragment rather than render it (plan §4).
  if (totalPages === 0) return `${totalElements} ${listingWord}${querySuffix}`
  return `Showing page ${page + 1} of ${totalPages} · ${totalElements} ${listingWord}${querySuffix}`
}

function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Untrusted URL input, clamped on every read. Never rewritten back into
  // the address bar — `?page=-3&sort=bogus` must render page 0, newest-first,
  // without ever touching history.
  const page = clampPage(searchParams.get('page'))
  const sort = clampSort(searchParams.get('sort'))
  const cardName = readCardName(searchParams)

  const path = (() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', '20')
    params.set('sort', sort)
    // Sent only when non-empty — `cardName=` is not a filter the user asked
    // for, and its server behaviour is undocumented (plan §4).
    if (cardName !== '') params.set('cardName', cardName)
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
  // Booleans driving the §3.4 empty-state table, computed once and reused by
  // the heading/body (via `emptyStateCopy`) and the action buttons below, so
  // there's a single source of truth instead of three parallel copies.
  const isPastEnd = page > 0
  const hasSearch = cardName !== ''
  const emptyState = isEmpty ? emptyStateCopy(page, cardName) : null

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

  // Shared by both "Clear search" entry points (beside the field in Step B,
  // and the empty-state button here). `sort` is never touched. The
  // focus-move onto the search input belongs to Step B, once the field
  // exists.
  function clearSearch() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('cardName')
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
            {summaryText(page, data.totalPages, data.totalElements, cardName)}
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
        // Four distinct situations (plan §3.4), not one message reused: an
        // empty catalogue, a bookmarked page past the end, a search miss,
        // and a search miss past the end. Telling a search miss "No
        // listings yet" would be false — the marketplace isn't empty, the
        // query just didn't match anything. `page > 0` takes heading
        // precedence over an active search: "you're past the end" is the
        // more actionable fact regardless of whether the query is fine
        // (see `emptyStateCopy`, the single source of truth for that table).
        // Stays outside the live region and keeps its dashed-border
        // treatment — no `aria-live` / `role` added here.
        <div className="space-y-3 border border-dashed border-zinc-300 p-8 text-center">
          <div className="space-y-1">
            <h2 className="break-words text-base font-medium text-zinc-900">
              {emptyState.heading}
            </h2>
            <p className="break-words text-sm text-zinc-600">{emptyState.body}</p>
          </div>
          {/* A legitimately empty page N (e.g. the catalogue shrank after
              this page was bookmarked, or a search only has fewer pages
              than expected) is a different situation from an empty result
              at page 0 — offer a way back (plan §3.4). */}
          {(isPastEnd || hasSearch) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isPastEnd && (
                <button
                  type="button"
                  onClick={() => goToPage(0)}
                  className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Back to first page
                </button>
              )}
              {hasSearch && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Clear search
                </button>
              )}
            </div>
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
