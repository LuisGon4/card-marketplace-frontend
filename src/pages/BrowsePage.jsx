import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'
import FilterBar from '../components/FilterBar'
import SecondaryButton from '../components/SecondaryButton'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import Pager from '../components/Pager'
import {
  FILTER_KEYS,
  SORT_OPTIONS,
  hasAnyFilter,
  readBrowseParams,
  withFilters,
  withoutFilters,
  withPage,
  withSort,
} from '../helpers/browse/searchParams'
import { emptyStateCopy, summaryText } from '../helpers/browse/copy'

function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Untrusted URL input, clamped on every read inside readBrowseParams —
  // never rewritten back into the address bar. `?page=-3&sort=bogus` must
  // render page 0, newest-first, without ever touching history.
  const { page, sort, committed } = readBrowseParams(searchParams)

  // The card-name field's DOM node, so a Clear-all triggered from either
  // entry point (FilterBar's own button, or the empty state's) can move
  // focus there after the button that was clicked unmounts itself. Created
  // here rather than inside FilterBar because both entry points that need
  // it live in this file; FilterBar just attaches it to the input. Read
  // only inside a handler, never during render.
  const firstFieldRef = useRef(null)
  // The <h1>'s DOM node, so Try again and Back to first page can move focus
  // there once the button the user just clicked unmounts itself. Unlike
  // Clear all, neither of these is a filter action, so the heading of the
  // region that changed — not the card-name input — is the target.
  const headingRef = useRef(null)

  const path = (() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('size', '20')
    params.set('sort', sort)
    // Each filter is sent only when non-empty, via one loop over
    // FILTER_KEYS so no filter can be special-cased — `condition=` is never
    // sent, `minPrice=` is never sent, etc. An empty value's server
    // behaviour is undocumented, and omission is the documented way to
    // disable one side of the price range.
    for (const key of FILTER_KEYS) {
      if (committed[key] !== '') params.set(key, committed[key])
    }
    return `/api/listings?${params.toString()}`
  })()

  const { data, loading, error, refetch } = useFetch(path)

  // content is documented as never null (BACKEND.md), but a loading/error
  // response has no data at all yet — guard with the empty-array fallback.
  const listings = data?.content ?? []
  const loaded = !loading && !error && data !== null
  const isEmpty = loaded && listings.length === 0
  // Forward availability comes from the response's own `hasNext` only — never
  // derived from `totalPages` (BACKEND.md's `PageResponse` shape).
  const hasNext = data?.hasNext ?? false
  // Same expression as copy.js's `page > 0` branch, but a different
  // question — gates these buttons vs. picks the empty-state message.
  const isPastEnd = page > 0
  const hasFilters = hasAnyFilter(committed)
  const emptyState = isEmpty ? emptyStateCopy(page, committed) : null

  // Shared by Try again and Back to first page: both unmount the button
  // that was just clicked, which would otherwise drop focus to <body>. Not
  // used by Clear all — that has its own, deliberately different target
  // (see clearAllFilters).
  function focusPageHeading() {
    headingRef.current?.focus()
  }

  function goToPage(nextPage) {
    // Push a history entry per change (Luis's decision — no `{ replace: true }`)
    // so the back button steps back through pages. `withPage` copies the
    // current params and touches only `page`.
    setSearchParams((prev) => withPage(prev, nextPage))
  }

  function handleSortChange(event) {
    setSearchParams((prev) => withSort(prev, event.target.value))
  }

  // Shared by both Clear entry points: beside the field (relabeled "Clear
  // all" and gated on `hasFilters`, not just cardName — a button that reads
  // "Clear" while silently deleting four other filters would lie about what
  // it does, and gating it on cardName alone would leave a URL like
  // `?condition=NM` with no visible way to clear it) and the empty-state
  // button (relabeled "Clear all filters" below).
  function clearAllFilters() {
    setSearchParams((prev) => withoutFilters(prev))
    // The button beside the field unmounts itself the moment this runs (it
    // only renders while hasFilters is true), so send focus to the input
    // rather than letting it fall to <body>.
    firstFieldRef.current?.focus()
  }

  // Called by FilterBar's Apply (Enter or the button) with the normalized
  // five-filter object, and skips the navigation entirely when nothing would
  // actually change — this is what stops re-Applying an identical query from
  // stuffing the history stack or firing a duplicate request. Comparing
  // against the outer `searchParams` (read directly, not via a functional
  // updater) is what makes the bail-out possible: the decision to skip has
  // to be made before `setSearchParams` is ever called.
  function applyFilters(next) {
    const built = withFilters(searchParams, next)
    if (built.toString() === searchParams.toString()) return
    setSearchParams(built)
  }

  return (
    <div className="space-y-6">
      {/* tabIndex={-1} is not a tab stop; it exists so focusPageHeading can
          land here. Removing it silently reintroduces the focus-to-<body>
          bug. */}
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-zinc-900">
        Browse listings
      </h1>

      {/* Filter bar extracted to its own component: it owns the draft
          object, the five-key sync, and Apply/Clear all; this page owns
          everything that determines what gets fetched (the clamped URL
          values, the request, the summary, the empty state). All five
          filters are read from the URL, sent in the request, and described
          below, via `committed`. */}
      <FilterBar
        committed={committed}
        onApply={applyFilters}
        onClearAll={clearAllFilters}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={handleSortChange}
        firstFieldRef={firstFieldRef}
      />

      {/* Single live region for the whole page — loading text and the
          results summary share it so paging/refresh announces once, not
          twice. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listings…</p>}
        {loaded && (
          <p className="break-words text-sm text-zinc-600">
            {summaryText(page, data.totalPages, data.totalElements, committed)}
          </p>
        )}
      </div>

      {error && (
        <ErrorNotice
          message={error.message}
          onRetry={() => {
            refetch()
            focusPageHeading()
          }}
        />
      )}

      {isEmpty && (
        // The empty-state cases and their precedence are documented once,
        // at emptyStateCopy — this is just the call site. EmptyState stays
        // outside the live region above; do not move this inside it.
        <EmptyState heading={emptyState.heading} body={emptyState.body}>
          {/* This outer guard isn't redundant with the two conditionals
              below: without it, two sibling expressions (one of which can
              be false) become the array `[false, false]`, which is truthy
              — EmptyState would render an empty, visible action row. */}
          {(isPastEnd || hasFilters) && (
            <>
              {/* A legitimately empty page N (e.g. the catalogue shrank
                  after this page was bookmarked, or these filters have
                  fewer pages than expected) is a different situation
                  from an empty result at page 0 — offer a way back. */}
              {isPastEnd && (
                <SecondaryButton
                  onClick={() => {
                    goToPage(0)
                    focusPageHeading()
                  }}
                >
                  Back to first page
                </SecondaryButton>
              )}
              {hasFilters && (
                <SecondaryButton onClick={clearAllFilters}>Clear all filters</SecondaryButton>
              )}
            </>
          )}
        </EmptyState>
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

      {/* Unconditional on purpose — see Pager. */}
      <Pager page={page} totalPages={data?.totalPages} hasNext={hasNext} onGoToPage={goToPage} />
    </div>
  )
}

export default BrowsePage
