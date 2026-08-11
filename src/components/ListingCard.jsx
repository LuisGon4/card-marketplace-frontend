// Pure, presentational card for a ListingSummaryResponse (BACKEND.md §1).
// No data loading, no fetch — the page that lists these owns fetching.

import { Link } from 'react-router'
import { conditionPrintingLabel } from '../lib/listings'
import ListingImage from './ListingImage'
import PriceBlock from './PriceBlock'

function ListingCard({
  id,
  cardName,
  condition,
  printing,
  askingPrice,
  marketPrice,
  priceFlagged,
  location,
  description,
  sellerUsername,
  thumbnailUrl,
  backTo,
  linkTitle = true,
  // /listings/mine is a single full-width column, unlike browse's grid, so
  // the square image would otherwise stretch to the page's full width.
  // Defaults to false so browse's rendering is untouched.
  capImage = false,
  children,
}) {
  const content = (
    <>
      <ListingImage src={thumbnailUrl} alt={cardName} loading="lazy" capped={capImage} />

      <div className="mt-3 space-y-1">
        {/* h2, not h3: the page's only other heading is BrowsePage's h1, so
            an h3 here would skip a level and break the heading outline that
            screen-reader users navigate by. A repeating h2 per grid item is
            the standard gallery pattern. */}
        <h2 className="text-base font-medium text-zinc-900">
          {/* after:absolute after:inset-0 stretches this link's hit area to
              cover the whole card, so the entire card is clickable while the
              accessible name stays just the title. That pseudo-element
              positions against the nearest positioned ancestor — the
              article's `relative` above. Nothing between here and the
              viewport (the <li>, the grid <ul>, the page's <div>) is
              positioned, so removing `relative` from the article makes the
              overlay resolve against the viewport instead, stretching this
              one listing's click target across most of the page. */}
          {linkTitle ? (
            <Link
              to={`/listings/${id}`}
              state={{ backTo }}
              className="text-zinc-900 hover:underline after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {cardName}
            </Link>
          ) : (
            // An inactive listing has no detail page to link to — GET
            // /api/listings/{id} 404s for everyone, owner included
            // (BACKEND.md § Listings). Without this branch the title's
            // stretched overlay above would make the whole card a
            // full-card click target to that 404.
            cardName
          )}
        </h2>
        <p className="text-sm text-zinc-700">{conditionPrintingLabel(condition, printing)}</p>
      </div>

      <PriceBlock
        askingPrice={askingPrice}
        marketPrice={marketPrice}
        priceFlagged={priceFlagged}
        className="mt-3"
      />

      {description && (
        <p className="mt-3 line-clamp-2 text-sm text-zinc-700">{description}</p>
      )}

      <div className="mt-auto space-y-0.5 pt-3 text-sm text-zinc-600">
        <p>{sellerUsername}</p>
        <p>{location}</p>
      </div>
    </>
  )

  return (
    // h-full + flex column so every card fills its grid row and the seller
    // meta pins to the bottom (mt-auto). Without this, cards with a shorter
    // description — or none at all — end up shorter than their neighbours.
    // relative anchors the title link's stretched overlay below — see the
    // comment there.
    <article className="relative flex h-full flex-col rounded border border-zinc-200 p-4">
      {children ? (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-1 flex-col">{content}</div>
          {/* relative lifts these controls above the title link's
              after:inset-0 overlay: both are z-index: auto positioned boxes,
              so the later one in tree order wins, and this slot is after the
              <h2> above — it must stay after it. No z-index is needed or
              wanted. */}
          <div className="relative space-y-2 border-t border-zinc-200 pt-3 sm:w-64 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            {children}
          </div>
        </div>
      ) : (
        content
      )}
    </article>
  )
}

export default ListingCard
