import { useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'
import FilterBar from '../components/FilterBar'
import { CONDITION_VALUES, PRINTING_VALUES, formatPrice, printingLabel } from '../lib/listings'

// Sort control (plan §5 Step 9). Fixed options, and — deliberately — each
// value carries the Spring-style direction suffix rather than a bare field
// name. BACKEND.md §1 ("sort" row): "Optional direction suffix ,asc/,desc
// ... only the field is validated" — so `createdAt,desc` and `askingPrice,desc`
// are both legal requests, and Step 8 already shipped `createdAt,desc` as the
// fixed default. Keeping the suffix here keeps the "Newest first" default
// consistent with Step 8, and lets the two `askingPrice` options share a field
// while differing only in direction. Do not "simplify" this back to a bare
// field name. Passed to FilterBar as a prop rather than duplicated there —
// don't add a second copy.
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

// The request builder below loops over this so no filter can be
// special-cased, and describeFilters / emptyStateCopy reuse it as the
// single definition of "which six params count as a filter."
const FILTER_KEYS = ['cardName', 'setName', 'condition', 'printing', 'minPrice', 'maxPrice']

// Same clamp-on-read treatment as clampPage / clampSort, generalized to
// take a key so cardName and setName share one function.
function readTrimmed(searchParams, key) {
  return (searchParams.get(key) ?? '').trim()
}

// Clamped case-sensitively on purpose: `?condition=nm` clamps to '', not
// 'NM' — do not add a `.toUpperCase()` to "help" it match.
function clampEnum(raw, validValues) {
  return validValues.has(raw) ? raw : ''
}

// Deliberately does not cap decimal places or round anything — the
// askingPrice column's enforced scale is undocumented, so capping would
// invent a constraint the contract doesn't state.
function readPrice(raw) {
  const s = (raw ?? '').trim()
  if (s === '') return ''
  // Plain non-negative decimal only: no sign, no exponent, no thousands
  // separator. Rejects '-1', '1e5', '1,000', '10.', '.', 'abc', and ''.
  if (!/^\d*(\.\d+)?$/.test(s)) return ''
  // A very long digit string passes the regex above but parses to Infinity —
  // the same class of guard as clampPage's Number.isSafeInteger check.
  if (!Number.isFinite(Number(s))) return ''
  return s
}

// Builds the "matching …" clause for the results summary, and the
// generic-miss body ("Filters: …") in the empty state — one source of truth
// for "what is applied", rendered in both places (plans/filters.md §3.6).
// FILTER_KEYS order throughout. The two price bounds collapse into a single
// descriptor rather than two: "price from $10.00 to $50.00" reads as one
// filter, not a pair.
function describeFilters(committed) {
  const parts = []
  if (committed.cardName !== '') {
    parts.push(`card name “${committed.cardName}”`)
  }
  if (committed.setName !== '') {
    parts.push(`set name “${committed.setName}”`)
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

// The single source of truth for the §3.7 empty-state table (seven rows:
// crossed range × page > 0/0 × how many filters are active) — stated once
// here rather than re-derived separately by the heading, body, and action
// buttons, which is what let "No listings yet" slip through on a search
// miss in the first place (plans/search.md §3.4). Order matters: each
// branch below runs only if the ones above it didn't match.
function emptyStateCopy(page, committed) {
  const hasFilters = FILTER_KEYS.some((key) => committed[key] !== '')

  // Keyed on the *committed* values, not a draft — this describes the
  // result actually on screen, which was produced by what was applied. (A
  // later step adds a filter-bar price hint keyed on the *draft* instead,
  // because that one describes what's about to be applied. Two different
  // sources for two different questions; it looks like an inconsistency and
  // isn't — plans/filters.md §3.7.)
  //
  // Crossed range takes top precedence over every other row, including
  // page > 0: the backend returns 0 rows for a crossed range, not a 400,
  // so when the bounds run backwards nothing else can explain why the
  // page is empty — not the card name, not which page this is.
  const isCrossedRange =
    committed.minPrice !== '' &&
    committed.maxPrice !== '' &&
    Number(committed.minPrice) > Number(committed.maxPrice)
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

  // "Only X" means X is the single active filter among all six, checked
  // against FILTER_KEYS so a future seventh filter can't silently break
  // this test.
  const isOnly = (key) =>
    committed[key] !== '' && FILTER_KEYS.every((k) => k === key || committed[k] === '')

  if (isOnly('cardName')) {
    return {
      heading: `No listings match “${committed.cardName}”`,
      body: 'Check the spelling, or search a shorter part of the name.',
    }
  }

  // setName's matching semantics are unverified (TODO(Luis) A). This row
  // deliberately gives the *opposite* advice from cardName's row above:
  // cardName is a confirmed partial match, so "search a shorter part" is
  // correct there; setName might be an exact match, so "try the full set
  // name" is the only advice that's right under either answer. Relax to
  // match cardName's wording once TODO(Luis) A closes as partial
  // (plans/filters.md §3.7).
  if (isOnly('setName')) {
    return {
      heading: `No listings match set “${committed.setName}”`,
      body: 'Check the spelling, and try the full set name — “Base Set” rather than “Base”.',
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

  // Untrusted URL input, clamped on every read. Never rewritten back into
  // the address bar — `?page=-3&sort=bogus` must render page 0, newest-first,
  // without ever touching history.
  const page = clampPage(searchParams.get('page'))
  const sort = clampSort(searchParams.get('sort'))
  const cardName = readTrimmed(searchParams, 'cardName')
  const setName = readTrimmed(searchParams, 'setName')
  const condition = clampEnum(searchParams.get('condition'), CONDITION_VALUES)
  const printing = clampEnum(searchParams.get('printing'), PRINTING_VALUES)
  const minPrice = readPrice(searchParams.get('minPrice'))
  const maxPrice = readPrice(searchParams.get('maxPrice'))
  // All six filters, collapsed to one object — the request loop, the
  // summary, and the empty-state table all key off this rather than six
  // separate parameters (plans/filters.md §5 Step 1).
  const committed = { cardName, setName, condition, printing, minPrice, maxPrice }

  // The card-name field's DOM node, so a Clear-all triggered from either
  // entry point (FilterBar's own button, or the empty state's) can move
  // focus there after the button that was clicked unmounts itself. Created
  // here rather than inside FilterBar because both entry points that need
  // it live in this file; FilterBar just attaches it to the input
  // (plans/filters.md §5 Step 2). Read only inside a handler, never during
  // render (plan §3.5, react-hooks/refs).
  const firstFieldRef = useRef(null)

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

  // Shared by both Clear entry points: beside the field (relabeled "Clear
  // all" and gated on `hasFilters`, not just cardName — a button that reads
  // "Clear" while silently deleting five other filters would lie about what
  // it does, and gating it on cardName alone would leave a URL like
  // `?condition=NM` with no visible way to clear it) and the empty-state
  // button (relabeled "Clear all filters" below). Deletes every filter key,
  // not just cardName, and never touches sort (plans/filters.md §5 Step 1).
  function clearAllFilters() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of FILTER_KEYS) {
        next.delete(key)
      }
      next.set('page', '0')
      return next
    })
    // The button beside the field unmounts itself the moment this runs (it
    // only renders while hasFilters is true), so send focus to the input
    // rather than letting it fall to <body> (plan §3.5).
    firstFieldRef.current?.focus()
  }

  // Called by FilterBar's Apply (Enter or the button) with the normalized
  // six-filter object. Builds the next URL from the *current* one — set or
  // delete only the FILTER_KEYS entries, leave sort and everything else
  // alone — and skips the navigation entirely when nothing would actually
  // change. This replaces Step 1's early-return inside the old
  // handleSearchSubmit, and is what stops re-Applying an identical query
  // from stuffing the history stack or firing a duplicate request
  // (plans/filters.md §5 Step 2, §6 decision 2). Comparing against the
  // outer `searchParams` (read directly, not via a functional updater) is
  // what makes the bail-out possible: the decision to skip has to be made
  // before `setSearchParams` is ever called.
  function applyFilters(next) {
    const built = new URLSearchParams(searchParams)
    for (const key of FILTER_KEYS) {
      if (next[key] === '') {
        built.delete(key)
      } else {
        built.set(key, next[key])
      }
    }
    built.set('page', '0')
    if (built.toString() === searchParams.toString()) return
    setSearchParams(built)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>

      {/* Filter bar extracted to its own component (plans/filters.md §5 Step
          2): it owns the draft object, the six-key sync, and Apply/Clear
          all; this page owns everything that determines what gets fetched
          (the clamped URL values, the request, the summary, the empty
          state). setName is deferred and minPrice/maxPrice land in Step 5 —
          but all six are already read from the URL, sent in the request,
          and described below, via `committed`. */}
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
            onClick={refetch}
            className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Try again
          </button>
        </div>
      )}

      {isEmpty && (
        // Seven distinct situations (plans/filters.md §3.7), not one
        // message reused: a crossed price range, an empty catalogue, a
        // bookmarked page past the end, a card-name miss, a set-name miss,
        // a miss on any other combination of filters, and any filtered
        // miss past the end. Telling a filtered miss "No listings yet"
        // would be false — the marketplace isn't empty, the filters just
        // didn't match anything. See `emptyStateCopy`, the single source of
        // truth for that table, for the precedence order. Stays outside the
        // live region and keeps its dashed-border treatment — no
        // `aria-live` / `role` added here.
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
                  onClick={() => goToPage(0)}
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
