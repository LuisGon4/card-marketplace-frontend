import { useState } from 'react'
import EmptyState from './EmptyState'
import ErrorNotice from './ErrorNotice'
import PrimaryButton from './PrimaryButton'
import FormField from './FormField'
import { FIELD_CONTROL_CLASS } from '../lib/fields'
import {
  choosePanelHeading,
  cardSearchLabel,
  cardSearchIdleHint,
  cardSearchEmptyStateCopy,
  cardResultDetail,
  selectedCardLabel,
} from '../helpers/sell/copy'

// One row in the card-search results list. Local to this component,
// following the Fact / ConversationRow precedent — not exported, not
// extracted.
function CardResult({ card, isSelected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(card)}
        aria-pressed={isSelected}
        // Two-signal selection (WCAG 1.4.1): aria-pressed plus this border.
        // Both states are border-2, never border vs border-2, so selecting a
        // result never shifts layout by a pixel.
        className={`w-full rounded border-2 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
          isSelected ? 'border-blue-700' : 'border-zinc-200'
        }`}
      >
        <p className="text-sm font-medium text-zinc-900">{card.cardName}</p>
        <p className="text-sm text-zinc-600">{cardResultDetail(card)}</p>
      </button>
    </li>
  )
}

function CardPicker({
  committedQuery,
  loaded,
  results,
  error,
  onSearch,
  onRetry,
  selectedCard,
  onSelect,
  searchRef,
}) {
  const [cardSearchDraft, setCardSearchDraft] = useState('')
  const hasSearchedCards = committedQuery !== ''
  const cardEmptyState =
    loaded && results.length === 0 ? cardSearchEmptyStateCopy(committedQuery) : null

  function handleCardSearchSubmit(event) {
    event.preventDefault()
    onSearch(cardSearchDraft.trim())
  }

  return (
    <section className="space-y-4 rounded border border-zinc-200 p-4">
      <h2 className="text-base font-medium text-zinc-900">{choosePanelHeading}</h2>

      {/* A sibling of the details form, never nested — HTML forbids
          nested <form>, and this is what makes Enter do the right
          thing in each form because the platform enforces it, not a
          keydown guard. */}
      <form
        role="search"
        onSubmit={handleCardSearchSubmit}
        className="flex items-end gap-2"
      >
        <FormField id="cardSearch" label={cardSearchLabel} className="flex-1">
          <input
            ref={searchRef}
            id="cardSearch"
            type="search"
            value={cardSearchDraft}
            onChange={(event) => setCardSearchDraft(event.target.value)}
            className={FIELD_CONTROL_CLASS}
          />
        </FormField>
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>

      {!hasSearchedCards && (
        <p className="text-sm text-zinc-700">{cardSearchIdleHint}</p>
      )}

      {error && (
        <ErrorNotice message={error.message} onRetry={onRetry} />
      )}

      {cardEmptyState && (
        <EmptyState heading={cardEmptyState.heading} body={cardEmptyState.body} />
      )}

      {loaded && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((card) => (
            <CardResult
              key={card.id}
              card={card}
              isSelected={selectedCard?.id === card.id}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}

      {selectedCard && (
        <p className="text-sm text-zinc-700">{selectedCardLabel(selectedCard.cardName)}</p>
      )}
    </section>
  )
}

export default CardPicker
