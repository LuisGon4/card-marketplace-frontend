import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'

// Fixed this step (plan §5 Step 8) — page/size/sort become controllable in
// Step 9. All three are sent explicitly rather than relying on server
// defaults, so the request fully describes what's on screen (plan §4).
// BACKEND.md §1: sort validates only the field (createdAt|askingPrice); the
// ",desc" direction suffix rides through unvalidated, and the server also
// defaults to createdAt,desc when sort is omitted — sent explicitly anyway.
const LISTINGS_PATH = (() => {
  const params = new URLSearchParams()
  params.set('page', '0')
  params.set('size', '20')
  params.set('sort', 'createdAt,desc')
  return `/api/listings?${params.toString()}`
})()

function summaryText(page, totalPages, totalElements) {
  const listingWord = totalElements === 1 ? 'listing' : 'listings'
  // Guard: an empty result set has totalPages === 0, so "Page 1 of 0" would
  // be nonsense — omit the page fragment rather than render it (plan §4).
  if (totalPages === 0) return `${totalElements} ${listingWord}`
  return `Showing page ${page + 1} of ${totalPages} · ${totalElements} ${listingWord}`
}

function BrowsePage() {
  const { data, loading, error, refetch } = useFetch(LISTINGS_PATH)

  // content is documented as never null (BACKEND.md), but a loading/error
  // response has no data at all yet — guard with the empty-array fallback.
  const listings = data?.content ?? []
  const loaded = !loading && !error && data !== null
  const isEmpty = loaded && listings.length === 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>

      {/* Single live region for the whole page (plan §3 a11y) — loading text
          and the results summary share it so paging/refresh announces once,
          not twice. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listings…</p>}
        {loaded && (
          <p className="text-sm text-zinc-600">
            {summaryText(0, data.totalPages, data.totalElements)}
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
        <div className="space-y-1 border border-dashed border-zinc-300 p-8 text-center">
          <h2 className="text-base font-medium text-zinc-900">No listings yet</h2>
          <p className="text-sm text-zinc-600">
            When sellers post cards, they&apos;ll appear here.
          </p>
        </div>
      )}

      {loaded && listings.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard {...listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default BrowsePage
