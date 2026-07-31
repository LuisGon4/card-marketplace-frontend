// Pure, presentational card for a ListingSummaryResponse (BACKEND.md §1).
// No data loading, no fetch — the page that lists these owns fetching.
// Not a <Link> this cycle: listing detail doesn't exist yet, so an anchor
// here would 404. The detail cycle converts this to a <Link>.

import { conditionPrintingLabel } from '../lib/listings'
import ListingImage from './ListingImage'
import PriceBlock from './PriceBlock'

function ListingCard({
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
}) {
  return (
    // h-full + flex column so every card fills its grid row and the seller
    // meta pins to the bottom (mt-auto). Without this, cards with a shorter
    // description — or none at all — end up shorter than their neighbours.
    <article className="flex h-full flex-col rounded border border-zinc-200 p-4">
      <ListingImage src={thumbnailUrl} alt={cardName} loading="lazy" />

      <div className="mt-3 space-y-1">
        {/* h2, not h3: the page's only other heading is BrowsePage's h1, so
            an h3 here would skip a level and break the heading outline that
            screen-reader users navigate by. A repeating h2 per grid item is
            the standard gallery pattern. */}
        <h2 className="text-base font-medium text-zinc-900">{cardName}</h2>
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
    </article>
  )
}

export default ListingCard
