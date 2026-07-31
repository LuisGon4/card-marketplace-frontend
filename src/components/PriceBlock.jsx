import { formatPrice } from '../lib/listings'

// Asking price, the market-price-or-"No market price" fallback, and the
// flag badge — one definition of the badge rule, so it can't drift between
// renderers. `className` is a passthrough appended to this component's own
// `space-y-1`, matching TextFilterField's idiom.
function PriceBlock({ askingPrice, marketPrice, priceFlagged, className = '' }) {
  // BACKEND.md: "priceFlagged is only meaningful when marketPrice is
  // non-null." The badge must never appear against a null market price,
  // even if the server sends priceFlagged: true alongside it.
  const showFlagBadge = marketPrice !== null && priceFlagged === true

  return (
    <div className={['space-y-1', className].filter(Boolean).join(' ')}>
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
        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
          Above market value
        </span>
      )}
    </div>
  )
}

export default PriceBlock
