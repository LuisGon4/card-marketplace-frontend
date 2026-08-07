import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { apiPost } from '../api/client'
import PageHeading from '../components/PageHeading'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import PrimaryButton from '../components/PrimaryButton'
import FormField from '../components/FormField'
import CardPicker from '../components/CardPicker'
import ValuationHint from '../components/ValuationHint'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import { CONDITION_OPTIONS, PRINTING_OPTIONS } from '../lib/listings'
import { EMPTY_DRAFT, submitBlock, buildCreateRequest } from '../helpers/sell/draft'
import {
  pageHeading,
  describePanelHeading,
  signedOutSellCopy,
  cardSearchLoadingText,
  cardResultCountText,
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

// Three field shapes local to this form, deliberately not FilterBar's
// TextFilterField/SelectFilterField (Fact / CardResult precedent — local
// beside its one consumer, not extracted). Same markup, opposite
// semantics: enterKeyHint="search" and spellCheck={false} are search
// behaviours that don't belong on a price or location field, and
// SelectFilterField's empty option means "filter off, a legal final
// state" where this form's empty option means "not chosen yet, invalid
// until changed."
function TextField({ id, label, value, onChange, ref, type = 'text', inputMode, describedBy }) {
  return (
    <FormField id={id} label={label}>
      <input
        ref={ref}
        type={type}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        aria-describedby={describedBy}
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

// Ships the card picker, the details form, the submit block,
// POST /api/listings, and the valuation hint beside the asking price.
function CreateListingPage({ authStatus }) {
  const isSignedIn = authStatus === 'signedIn'
  const navigate = useNavigate()

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

  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [blockedField, setBlockedField] = useState(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  // Focus target when submitBlock names 'askingPrice'.
  const askingPriceRef = useRef(null)

  const askingPriceHintId = hintIdFor('askingPrice')
  const valuationGated = Boolean(selectedCard && draft.condition && draft.printing)
  const valuationPath = valuationGated
    ? `/api/cards/${selectedCard.id}/valuation?${new URLSearchParams({
        condition: draft.condition,
        printing: draft.printing,
      }).toString()}`
    : null
  // useFetch nulls `data` at the start of every request — wanted here, not
  // worked around: a price fetched for one condition/printing is wrong the
  // instant either changes, so it must vanish immediately rather than be
  // mirrored into local state.
  const {
    data: valuationData,
    loading: valuationLoading,
    error: valuationError,
    refetch: refetchValuation,
  } = useFetch(valuationPath)
  const valuationSettled = valuationGated && !valuationLoading
  const valuationIsNull = Boolean(valuationData) && valuationData.marketPrice === null

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
          <CardPicker
            committedQuery={committedCardQuery}
            loaded={cardResultsLoaded}
            results={cardResults}
            error={cardSearchError}
            onSearch={setCommittedCardQuery}
            onRetry={refetchCardSearch}
            selectedCard={selectedCard}
            onSelect={setSelectedCard}
            searchRef={cardSearchRef}
          />

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
                describedBy={valuationSettled ? askingPriceHintId : undefined}
              />
              <TextField
                id="location"
                label={locationFieldLabel}
                value={draft.location}
                onChange={(value) => updateDraft('location', value)}
              />
            </div>

            {/* Deliberately outside the role="status" live region: this
                changes on every condition/printing toggle, and announcing it
                would interrupt the form for advisory information. Wired by
                aria-describedby on the asking-price input instead. */}
            {valuationSettled && (
              <ValuationHint
                hintId={askingPriceHintId}
                error={valuationError}
                isNull={valuationIsNull}
                marketPrice={valuationData?.marketPrice}
                onCheckAgain={refetchValuation}
              />
            )}

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
