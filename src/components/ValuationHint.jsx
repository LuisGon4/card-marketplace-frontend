import SecondaryButton from './SecondaryButton'
import { marketPriceHint, marketPriceUnavailableHint, checkValuationAgainLabel } from '../helpers/sell/copy'

function ValuationHint({ hintId, error, isNull, marketPrice, onCheckAgain }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p id={hintId} className="text-sm text-zinc-700">
        {error
          ? // A failed valuation is advisory, not a blocked form:
            // the server's text verbatim in a muted line, never
            // ErrorNotice — that role="alert" would announce over
            // the form and imply create is broken when it isn't.
            error.message
          : isNull
            ? marketPriceUnavailableHint
            : marketPrice != null && marketPriceHint(marketPrice)}
      </p>
      {isNull && (
        <SecondaryButton onClick={onCheckAgain}>
          {checkValuationAgainLabel}
        </SecondaryButton>
      )}
    </div>
  )
}

export default ValuationHint
