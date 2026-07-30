import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'
import FilterBar from '../components/FilterBar'
import { formatPrice, isPriceRangeCrossed, printingLabel } from '../lib/listings'
import {
  FILTER_KEYS,
  SORT_OPTIONS,
  readBrowseParams,
  withFilters,
  withoutFilters,
  withPage,
  withSort,
} from '../helpers/browse/searchParams'

// Builds the "matching …" clause for the results summary, and the
// generic-miss body ("Filters: …") in the empty state — one source of truth
// for "what is applied", rendered in both places. FILTER_KEYS order
// throughout. The two price bounds collapse into a single descriptor rather
// than two: "price from $10.00 to $50.00" reads as one filter, not a pair.
function describeFilters(committed) {
  const parts = []
  if (committed.cardName !== '') {
    parts.push(`card name “${committed.cardName}”`)
  }
  if (committed.condition !== '') {
    // Raw code, not the expanded label — matches how ListingCard renders it
    // (ListingCard.jsx line 77), so the summary and the card speak the same
    // vocabulary.
    parts.push(`condition ${committed.condition}`)
  }
  if (committed.printing !== '') {
    parts.push(`printing ${printingLabel(committed.printing)}`)
  }
  const { minPrice, maxPrice } = committed
  // Neutral "from"/"to" wording, not an en dash (inconsistent screen-reader
  // handling) and no "and up" / "or less" / "inclusive" wording — a
  // deliberate choice by Luis to keep the announcement short, not a hedge
  // about boundary behaviour (all three price bounds are inclusive).
  if (minPrice !== '' && maxPrice !== '') {
    parts.push(`price from ${formatPrice(Number(minPrice))} to ${formatPrice(Number(maxPrice))}`)
  } else if (minPrice !== '') {
    parts.push(`price from ${formatPrice(Number(minPrice))}`)
  } else if (maxPrice !== '') {
    parts.push(`price up to ${formatPrice(Number(maxPrice))}`)
  }
  return parts
}

// The single source of truth for the §3.7 empty-state table (six rows:
// crossed range × page > 0/0 × how many filters are active) — stated once
// here rather than re-derived separately by the heading, body, and action
// buttons, which is what let "No listings yet" slip through on a search
// miss in the first place (plans/search.md §3.4). Order matters: each
// branch below runs only if the ones above it didn't match.
function emptyStateCopy(page, committed) {
  const hasFilters = FILTER_KEYS.some((key) => committed[key] !== '')

  // Keyed on the *committed* values, not a draft — this describes the
  // result actually on screen, which was produced by what was applied.
  // FilterBar's price hint is keyed on the *draft* instead, since it
  // describes what's about to be applied — two different questions, not
  // an inconsistency.
  //
  // Crossed range takes top precedence over every other row, including
  // page > 0: the backend returns 0 rows for a crossed range, not a 400,
  // so when the bounds run backwards nothing else can explain why the
  // page is empty — not the card name, not which page this is.
  const isCrossedRange = isPriceRangeCrossed(committed.minPrice, committed.maxPrice)
  if (isCrossedRange) {
    return {
      heading: 'Min price is higher than max price',
      body: 'Nothing can match a range that runs backwards. Swap the two amounts, or clear one.',
    }
  }

  // `page > 0` takes heading precedence over active filters otherwise:
  // "you're past the end" is the more actionable fact regardless of
  // whether the filters are fine (plans/filters.md §3.7, same precedent as
  // plans/search.md §3.4).
  if (page > 0) {
    return {
      heading: 'Nothing on this page',
      body: hasFilters
        ? 'No more results for these filters past this page.'
        : 'This page is past the end of the results.',
    }
  }

  if (!hasFilters) {
    return {
      heading: 'No listings yet',
      body: "When sellers post cards, they'll appear here.",
    }
  }

  // "Only X" means X is the single active filter among all five, checked
  // against FILTER_KEYS so a future sixth filter can't silently break this
  // test.
  const isOnly = (key) =>
    committed[key] !== '' && FILTER_KEYS.every((k) => k === key || committed[k] === '')

  if (isOnly('cardName')) {
    return {
      heading: `No listings match “${committed.cardName}”`,
      body: 'Check the spelling, or search a shorter part of the name.',
    }
  }

  return {
    heading: 'No listings match these filters',
    body: `Filters: ${describeFilters(committed).join(', ')}. Try removing one.`,
  }
}

function summaryText(page, totalPages, totalElements, committed) {
  const listingWord = totalElements === 1 ? 'listing' : 'listings'
  // Enumerates the active filters rather than counting them (plans/filters.md
  // §3.6): this line lives in the page's only live region, so it's the only
  // confirmation a screen-reader user gets about *which* filters were
  // applied, not just that a number changed.
  const descriptors = describeFilters(committed)
  const querySuffix = descriptors.length > 0 ? ` matching ${descriptors.join(', ')}` : ''
  // Guard: an empty result set has totalPages === 0, so "Page 1 of 0" would
  // be nonsense — omit the page fragment rather than render it (plan §4).
  if (totalPages === 0) return `${totalElements} ${listingWord}${querySuffix}`
  return `Showing page ${page + 1} of ${totalPages} · ${totalElements} ${listingWord}${querySuffix}`
}

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
  // it live in this file; FilterBar just attaches it to the input
  // (plans/filters.md §5 Step 2). Read only inside a handler, never during
  // render (plan §3.5, react-hooks/refs).
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
  // derived from `totalPages` (plan §4 `PageResponse` handling).
  const hasNext = data?.hasNext ?? false
  // Booleans driving the §3.7 empty-state table, computed once and reused
  // by the heading/body (via `emptyStateCopy`) and the action buttons
  // below, so there's a single source of truth instead of three parallel
  // copies.
  const isPastEnd = page > 0
  const hasFilters = FILTER_KEYS.some((key) => committed[key] !== '')
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

      {/* Single live region for the whole page (plan §3 a11y) — loading text
          and the results summary share it so paging/refresh announces once,
          not twice. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listings…</p>}
        {loaded && (
          <p className="break-words text-sm text-zinc-600">
            {summaryText(page, data.totalPages, data.totalElements, committed)}
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
            onClick={() => {
              refetch()
              focusPageHeading()
            }}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      {isEmpty && (
        // Six distinct situations (plans/filters.md §3.7), not one message
        // reused: a crossed price range, an empty catalogue, a bookmarked
        // page past the end, a card-name miss, a miss on any other
        // combination of filters, and any filtered miss past the end.
        // Telling a filtered miss "No listings yet" would be false — the
        // marketplace isn't empty, the filters just didn't match anything.
        // See `emptyStateCopy`, the single source of truth for that table,
        // for the precedence order. Stays outside the live region and
        // keeps its dashed-border treatment — no `aria-live` / `role`
        // added here.
        <div className="space-y-3 border border-dashed border-zinc-300 p-8 text-center">
          <div className="space-y-1">
            <h2 className="break-words text-base font-medium text-zinc-900">
              {emptyState.heading}
            </h2>
            <p className="break-words text-sm text-zinc-600">{emptyState.body}</p>
          </div>
          {/* A legitimately empty page N (e.g. the catalogue shrank after
              this page was bookmarked, or these filters only have fewer
              pages than expected) is a different situation from an empty
              result at page 0 — offer a way back (plans/filters.md §3.7). */}
          {(isPastEnd || hasFilters) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isPastEnd && (
                <button
                  type="button"
                  onClick={() => {
                    goToPage(0)
                    focusPageHeading()
                  }}
                  className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Back to first page
                </button>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  Clear all filters
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
