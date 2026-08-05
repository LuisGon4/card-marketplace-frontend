import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import PageHeading from '../components/PageHeading'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import PrimaryButton from '../components/PrimaryButton'
import FormField from '../components/FormField'
import { FIELD_CONTROL_CLASS } from '../lib/fields'
import {
  pageHeading,
  choosePanelHeading,
  describePanelHeading,
  signedOutSellCopy,
  cardSearchLabel,
  cardSearchIdleHint,
  cardSearchLoadingText,
  cardResultCountText,
  cardSearchEmptyStateCopy,
  cardResultDetail,
  selectedCardLabel,
} from '../helpers/sell/copy'

// One row in the card-search results list. Local to this page, following
// the Fact / ConversationRow precedent — not exported, not extracted.
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

// Ships the shell plus the card picker: the search form, GET /api/cards,
// all four picker states, and selection. The details fields, submit, and
// valuation arrive with later steps.
function CreateListingPage({ authStatus }) {
  const isSignedIn = authStatus === 'signedIn'

  const [cardSearchDraft, setCardSearchDraft] = useState('')
  // Separate from the draft, exactly as FilterBar separates draft from
  // committed. '' is the idle state, distinct from a search that ran and
  // found nothing.
  const [committedCardQuery, setCommittedCardQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)

  const hasSearchedCards = committedCardQuery !== ''
  // null is useFetch's skip mechanism — an empty or whitespace-only query
  // fires nothing, since `name` is required and its empty-value behaviour
  // is undocumented.
  const cardSearchPath = hasSearchedCards
    ? `/api/cards?name=${encodeURIComponent(committedCardQuery)}`
    : null
  const {
    data: cardSearchData,
    loading: cardSearchLoading,
    error: cardSearchError,
    refetch: refetchCardSearch,
  } = useFetch(cardSearchPath)

  const cardResults = cardSearchData ?? []
  // Gated on hasSearchedCards, not just !loading && !error: those are also
  // true before any search has run, and without this guard the idle state
  // would render as a zero-result EmptyState instead of the idle hint.
  const cardResultsLoaded = hasSearchedCards && !cardSearchLoading && !cardSearchError
  const cardEmptyState =
    cardResultsLoaded && cardResults.length === 0
      ? cardSearchEmptyStateCopy(committedCardQuery)
      : null

  function handleCardSearchSubmit(event) {
    event.preventDefault()
    setCommittedCardQuery(cardSearchDraft.trim())
  }

  return (
    <div className="space-y-6">
      <PageHeading>{pageHeading}</PageHeading>

      <div role="status" aria-live="polite">
        {cardSearchLoading && <p className="text-sm text-zinc-600">{cardSearchLoadingText}</p>}
        {cardResultsLoaded && (
          <p className="break-words text-sm text-zinc-600">
            {cardResultCountText(committedCardQuery, cardResults.length)}
          </p>
        )}
      </div>

      {/* The header owns the only Sign in control (CLAUDE.md's auth
          boundary) — this points at it rather than rendering one. */}
      {authStatus === 'signedOut' && (
        <EmptyState heading={signedOutSellCopy.heading} body={signedOutSellCopy.body} />
      )}

      {isSignedIn && (
        <>
          <section className="space-y-4 rounded border border-zinc-200 p-4">
            <h2 className="text-base font-medium text-zinc-900">{choosePanelHeading}</h2>

            {/* A sibling of the details form arriving in a later step, never
                nested — HTML forbids nested <form>, and this is what makes
                Enter do the right thing in each form because the platform
                enforces it, not a keydown guard. */}
            <form
              role="search"
              onSubmit={handleCardSearchSubmit}
              className="flex items-end gap-2"
            >
              <FormField id="cardSearch" label={cardSearchLabel} className="flex-1">
                <input
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

            {cardSearchError && (
              <ErrorNotice message={cardSearchError.message} onRetry={refetchCardSearch} />
            )}

            {cardEmptyState && (
              <EmptyState heading={cardEmptyState.heading} body={cardEmptyState.body} />
            )}

            {cardResultsLoaded && cardResults.length > 0 && (
              <ul className="space-y-2">
                {cardResults.map((card) => (
                  <CardResult
                    key={card.id}
                    card={card}
                    isSelected={selectedCard?.id === card.id}
                    onSelect={setSelectedCard}
                  />
                ))}
              </ul>
            )}

            {selectedCard && (
              <p className="text-sm text-zinc-700">{selectedCardLabel(selectedCard.cardName)}</p>
            )}
          </section>

          <section className="space-y-4 rounded border border-zinc-200 p-4">
            <h2 className="text-base font-medium text-zinc-900">{describePanelHeading}</h2>
          </section>
        </>
      )}
    </div>
  )
}

export default CreateListingPage
