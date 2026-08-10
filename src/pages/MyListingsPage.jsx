import { useRef } from 'react'
import { useFetch } from '../hooks/useFetch'
import ListingCard from '../components/ListingCard'
import PageHeading from '../components/PageHeading'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import TextLink from '../components/TextLink'
import {
  emptyMyListingsCopy,
  listingStatusLine,
  loadingMyListingsText,
  myListingsPageHeading,
  myListingsSummary,
  signedOutMyListingsCopy,
} from '../helpers/sell/copy'

// One row per ListingSummaryResponse (BACKEND.md), plus the status line
// every row carries. `backTo` is deliberately not passed to ListingCard:
// ListingDetailPage's back link always reads "Back to browse" and points at
// "/", and feeding a /listings/mine backTo here would make that label lie.
// `linkTitle={listing.isActive}` is a rendering fact, not a gate — an
// inactive listing simply has no detail page to link to.
function MyListingRow({ listing }) {
  return (
    <li className="space-y-2">
      <ListingCard {...listing} linkTitle={listing.isActive} />
      <p className="text-sm text-zinc-700">{listingStatusLine(listing.isActive)}</p>
    </li>
  )
}

function MyListingsPage({ authStatus }) {
  const headingRef = useRef(null)
  const isSignedIn = authStatus === 'signedIn'

  // useFetch already accepts null and clears on the way down — skips the
  // request while signed out or still checking.
  const { data, error, refetch } = useFetch(isSignedIn ? '/api/listings/mine' : null)

  // Deliberately does not consult `loading`: the page's states are derived
  // from what it *has* (data/error), not from what the hook is *doing*.
  // Today loading===true always coincides with data===null (useFetch sets
  // both in the same batch), so adding `!loading` here would be a no-op —
  // but it would also make `loaded` depend on that coincidence. If useFetch
  // ever kept stale data across a refetch (a natural "don't flash the list"
  // change), a `!loading` guard here would blank the list on every refetch
  // instead of leaving the old one up. Don't add it back as a "safety check".
  const loaded = isSignedIn && !error && data !== null
  // GET /api/listings/mine returns a bare array (BACKEND.md) — no
  // `.content` to unwrap, unlike browse's PageResponse.
  const listings = loaded ? data : []
  const isEmpty = loaded && listings.length === 0
  const inactiveCount = listings.filter((listing) => !listing.isActive).length
  // "Checking…" folds into the same loading text as the fetch itself —
  // there is nothing meaningful to show until authStatus resolves.
  //
  // Keyed on `data === null`, not `loading`: the render where authStatus
  // flips 'checking' -> 'signedIn' commits before useFetch's effect has run
  // for the new path, so `loading` is still false from the `null`-path
  // render that just ended. `data` is null for that entire render too, so
  // this keeps the loading text up instead of leaving a one-commit gap
  // where nothing renders. Do not "simplify" this back to `loading`.
  const showLoading = authStatus === 'checking' || (isSignedIn && data === null && !error)

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{myListingsPageHeading}</PageHeading>

      <div role="status" aria-live="polite">
        {showLoading && <p className="text-sm text-zinc-600">{loadingMyListingsText}</p>}
        {loaded && (
          <p className="text-sm text-zinc-600">
            {myListingsSummary(listings.length, inactiveCount)}
          </p>
        )}
      </div>

      {/* No "Refresh" button here, unlike ConversationsPage: a conversation someone
          else opens is invisible until refetched, but nothing outside this page can
          change *your* listings, and any mutation this page performs refetches on
          completion. Don't add one back — there's nothing for it to catch that a
          mutation wouldn't already refresh. */}

      {isSignedIn && error && (
        <ErrorNotice
          message={error.message}
          onRetry={() => {
            refetch()
            focusPageHeading()
          }}
        />
      )}

      {/* The header owns the only Sign in control (CLAUDE.md's auth
          boundary) — this points at it rather than rendering one. */}
      {authStatus === 'signedOut' && (
        <EmptyState heading={signedOutMyListingsCopy.heading} body={signedOutMyListingsCopy.body} />
      )}

      {isEmpty && (
        <EmptyState heading={emptyMyListingsCopy.heading} body={emptyMyListingsCopy.body}>
          <TextLink to="/listings/new">Sell a card</TextLink>
        </EmptyState>
      )}

      {loaded && listings.length > 0 && (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <MyListingRow key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyListingsPage
