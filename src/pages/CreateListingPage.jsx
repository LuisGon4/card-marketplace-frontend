import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { apiPost } from '../api/client'
import PageHeading from '../components/PageHeading'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import PrimaryButton from '../components/PrimaryButton'
import FormField from '../components/FormField'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import { CONDITION_OPTIONS, PRINTING_OPTIONS } from '../lib/listings'
import { EMPTY_DRAFT, submitBlock, buildCreateRequest } from '../helpers/sell/draft'
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
  conditionFieldLabel,
  printingFieldLabel,
  conditionEmptyOptionLabel,
  printingEmptyOptionLabel,
  askingPriceFieldLabel,
  locationFieldLabel,
  descriptionFieldLabel,
  descriptionHint,
  submitBlockMessage,
  creatingListingText,
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

// Three field shapes local to this form, deliberately not FilterBar's
// TextFilterField/SelectFilterField (Fact / CardResult precedent — local
// beside its one consumer, not extracted). Same markup, opposite
// semantics: enterKeyHint="search" and spellCheck={false} are search
// behaviours that don't belong on a price or location field, and
// SelectFilterField's empty option means "filter off, a legal final
// state" where this form's empty option means "not chosen yet, invalid
// until changed."
function TextField({ id, label, value, onChange, ref, type = 'text', inputMode }) {
  return (
    <FormField id={id} label={label}>
      <input
        ref={ref}
        type={type}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        className={FIELD_CONTROL_CLASS}
      />
    </FormField>
  )
}

function SelectField({ id, label, emptyOptionLabel, options, value, onChange }) {
  return (
    <FormField id={id} label={label}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CONTROL_CLASS}
      >
        <option value="">{emptyOptionLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

function TextAreaField({ id, label, value, onChange, hint }) {
  return (
    <FormField id={id} label={label} hint={hint}>
      <textarea
        id={id}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintIdFor(id)}
        className={FIELD_CONTROL_CLASS}
      />
    </FormField>
  )
}

// Ships the card picker, the details form, the submit block, and
// POST /api/listings. The valuation hint arrives in a later step.
function CreateListingPage({ authStatus }) {
  const isSignedIn = authStatus === 'signedIn'
  const navigate = useNavigate()

  const [cardSearchDraft, setCardSearchDraft] = useState('')
  // Separate from the draft, exactly as FilterBar separates draft from
  // committed. '' is the idle state, distinct from a search that ran and
  // found nothing.
  const [committedCardQuery, setCommittedCardQuery] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  // Focus target when submitBlock names 'card'.
  const cardSearchRef = useRef(null)

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

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [blockedField, setBlockedField] = useState(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  // Focus target when submitBlock names 'askingPrice'.
  const askingPriceRef = useRef(null)

  // Tracks whether this component is still mounted across the POST's
  // await — the same gap ListingDetailPage's handleMessageSeller guards.
  // navigate() itself is unaffected either way; this only guards the two
  // setState calls below it from firing after the user has left.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function updateDraft(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    // Guards re-entrancy at the operation, not the control: after a
    // failure both the button and ErrorNotice's "Try again" call this
    // handler, and only the button gets `disabled` from `posting`.
    if (posting) return

    const field = submitBlock(draft, selectedCard?.id)
    setBlockedField(field)
    setPostError(null)
    if (field) {
      if (field === 'card') {
        cardSearchRef.current?.focus()
      } else {
        askingPriceRef.current?.focus()
      }
      return
    }

    setPosting(true)
    try {
      const created = await apiPost('/api/listings', buildCreateRequest(draft, selectedCard.id))
      if (!mountedRef.current) return
      // replace: true is load-bearing — without it, Back from the image
      // page returns to a spent create form, and a reflexive re-submit
      // creates a second listing.
      navigate(`/listings/${created.id}/images`, { replace: true })
    } catch (err) {
      if (!mountedRef.current) return
      // Accepted risk: POST /api/listings is not idempotent, so "Try
      // again" here can create a duplicate listing. The common failures
      // (400, 401, 404 card not found) create nothing; the one dangerous
      // case — the POST succeeded but the response was lost — is visible
      // rather than silent, since the user lands on the image page for
      // whichever listing the retry created.
      setPostError(err)
      setPosting(false)
    }
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
        {posting && <p className="text-sm text-zinc-600">{creatingListingText}</p>}
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
                  ref={cardSearchRef}
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

          <form
            onSubmit={handleCreateSubmit}
            className="space-y-4 rounded border border-zinc-200 p-4"
          >
            <h2 className="text-base font-medium text-zinc-900">{describePanelHeading}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="condition"
                label={conditionFieldLabel}
                emptyOptionLabel={conditionEmptyOptionLabel}
                options={CONDITION_OPTIONS}
                value={draft.condition}
                onChange={(value) => updateDraft('condition', value)}
              />
              <SelectField
                id="printing"
                label={printingFieldLabel}
                emptyOptionLabel={printingEmptyOptionLabel}
                options={PRINTING_OPTIONS}
                value={draft.printing}
                onChange={(value) => updateDraft('printing', value)}
              />
              {/* Plain text + inputMode="decimal", not a native numeric
                  input — FilterBar's price fields use the same shape, for
                  the same reason: a numeric input reads back '' the moment
                  the browser can't sanitize what was typed. */}
              <TextField
                id="askingPrice"
                label={askingPriceFieldLabel}
                value={draft.askingPrice}
                onChange={(value) => updateDraft('askingPrice', value)}
                ref={askingPriceRef}
                type="text"
                inputMode="decimal"
              />
              <TextField
                id="location"
                label={locationFieldLabel}
                value={draft.location}
                onChange={(value) => updateDraft('location', value)}
              />
            </div>

            <TextAreaField
              id="description"
              label={descriptionFieldLabel}
              value={draft.description}
              onChange={(value) => updateDraft('description', value)}
              hint={descriptionHint(draft.description.length)}
            />

            <PrimaryButton type="submit" disabled={posting}>
              Create listing
            </PrimaryButton>

            {blockedField && (
              <p className="text-sm text-zinc-700">{submitBlockMessage(blockedField)}</p>
            )}

            {postError && <ErrorNotice message={postError.message} onRetry={handleCreateSubmit} />}
          </form>
        </>
      )}
    </div>
  )
}

export default CreateListingPage
