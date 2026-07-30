// Pure, presentational card for a ListingSummaryResponse (BACKEND.md §1).
// No data loading, no fetch — the page that lists these owns fetching.
// Not a <Link> this cycle: listing detail doesn't exist yet, so an anchor
// here would 404. The detail cycle converts this to a <Link>.

import { formatPrice, printingLabel } from '../lib/listings'

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
  // BACKEND.md: "priceFlagged is only meaningful when marketPrice is
  // non-null." The badge must never appear against a null market price,
  // even if the server sends priceFlagged: true alongside it.
  const showFlagBadge = marketPrice !== null && priceFlagged === true

  return (
    // h-full + flex column so every card fills its grid row and the seller
    // meta pins to the bottom (mt-auto). Without this, cards with a shorter
    // description — or none at all — end up shorter than their neighbours.
    <article className="flex h-full flex-col rounded border border-zinc-200 p-4">
      {thumbnailUrl === null ? (
        // bg-zinc-50 is the "nothing here" surface; the bg-zinc-100 below
        // is the letterbox behind a real image.
        <div className="flex aspect-square items-center justify-center bg-zinc-50 text-sm text-zinc-600">
          No image
        </div>
      ) : (
        <img
          src={thumbnailUrl}
          alt={cardName}
          loading="lazy"
          className="aspect-square w-full bg-zinc-100 object-contain"
        />
      )}

      <div className="mt-3 space-y-1">
        {/* h2, not h3: the page's only other heading is BrowsePage's h1, so
            an h3 here would skip a level and break the heading outline that
            screen-reader users navigate by. A repeating h2 per grid item is
            the standard gallery pattern. */}
        <h2 className="text-base font-medium text-zinc-900">{cardName}</h2>
        <p className="text-sm text-zinc-700">
          {condition} · {printingLabel(printing)}
        </p>
      </div>

      <div className="mt-3 space-y-1">
        <p className="tabular-nums text-base font-medium text-zinc-900">
          {formatPrice(askingPrice)}
        </p>
        {marketPrice === null ? (
          <p className="text-sm text-zinc-600">No market price</p>
        ) : (
          <p className="tabular-nums text-sm text-zinc-600">
            Market {formatPrice(marketPrice)}
          </p>
        )}
        {showFlagBadge && (
          // TODO(Luis): BACKEND.md doesn't define whether priceFlagged means
          // above or below market. Label stays neutral until confirmed —
          // both prices are shown above so the reader can compare.
          <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            Price flagged
          </span>
        )}
      </div>

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
