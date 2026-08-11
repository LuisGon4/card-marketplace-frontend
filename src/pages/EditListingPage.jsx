import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { apiPatch } from '../api/client'
import PageHeading from '../components/PageHeading'
import EmptyState from '../components/EmptyState'
import ErrorNotice from '../components/ErrorNotice'
import PrimaryButton from '../components/PrimaryButton'
import TextLink from '../components/TextLink'
import FormField from '../components/FormField'
import ValuationHint from '../components/ValuationHint'
import { FIELD_CONTROL_CLASS, hintIdFor } from '../lib/fields'
import { editGate } from '../helpers/sell/gates'
import { editDraftFrom, editSubmitBlock, buildUpdateRequest } from '../helpers/sell/draft'
import {
  askingPriceFieldLabel,
  backToMyListingsLabel,
  descriptionFieldLabel,
  descriptionHint,
  editFixedFieldsNote,
  editGateMessage,
  editListingDetailsHeading,
  editListingPageHeading,
  editListingSubline,
  loadingMyListingsText,
  myListingsLinkLabel,
  savingChangesText,
  signedOutMyListingsCopy,
  submitBlockMessage,
} from '../helpers/sell/copy'

// Ships the edit gate, prefill from GET /api/listings/mine, the two-field
// form, PATCH /api/listings/{id}, and the valuation hint beside the asking
// price. Sources its prefill from `mine`, not from GET /api/listings/{id}:
// membership in that array is the server's own ownership answer, and
// isActive — which the edit gate needs before it renders anything — isn't
// on ListingDetailsResponse at all.
function EditListingPage({ authStatus }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const headingRef = useRef(null)
  const isSignedIn = authStatus === 'signedIn'

  const { data, error, refetch } = useFetch(isSignedIn ? '/api/listings/mine' : null)

  // Same derivation as ConversationsPage, for the same reason: these states
  // are derived from what the fetch *has* (data/error), not from what it's
  // *doing* (`loading`). Do not "simplify" this back to `loading`.
  const loaded = isSignedIn && !error && data !== null
  const showLoading = authStatus === 'checking' || (isSignedIn && data === null && !error)

  // Deliberate omission: no sellerId === user.id check here, and this page
  // takes no `user` prop at all. Membership in /listings/mine already is the
  // server's ownership answer — a client-side comparison on top would only
  // ever disagree with it when the server is lying, which the standing rule
  // treats as pure drift risk.
  const listing = loaded ? data.find((item) => item.id === id) : undefined
  const gate = loaded ? editGate(listing) : null
  const gateMessage = gate ? editGateMessage(gate) : null

  const [seededId, setSeededId] = useState(null)
  const [draft, setDraft] = useState({ askingPrice: '', description: '' })
  // Adjust-during-render sync, not a useEffect: an effect would paint one
  // stale (empty) frame of the form before the fetched values land — the
  // same hazard ListingDetailPage's messageSellerListingId guards against.
  // Keyed on the listing's own id, not a boolean, so a future navigation
  // between two edit pages (not reachable today; React Router doesn't
  // remount this component on an :id-only change) reseeds instead of
  // keeping the previous listing's draft.
  if (listing && seededId !== listing.id) {
    setDraft(editDraftFrom(listing))
    setSeededId(listing.id)
  }

  const [blockedField, setBlockedField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const askingPriceRef = useRef(null)

  const askingPriceHintId = hintIdFor('askingPrice')
  // Simpler than CreateListingPage's gate: condition and printing come from
  // the loaded listing and never change on this page, so there's no
  // selection to wait on — only whether the form (and so the listing) exists.
  const valuationGated = loaded && gate === null
  const valuationPath = valuationGated
    ? `/api/cards/${listing.cardId}/valuation?${new URLSearchParams({
        condition: listing.condition,
        printing: listing.printing,
      }).toString()}`
    : null
  const {
    data: valuationData,
    loading: valuationLoading,
    error: valuationError,
    refetch: refetchValuation,
  } = useFetch(valuationPath)
  const valuationSettled = valuationGated && !valuationLoading
  const valuationIsNull = Boolean(valuationData) && valuationData.marketPrice === null
  const valuationHint = valuationSettled && (
    <ValuationHint
      hintId={askingPriceHintId}
      error={valuationError}
      isNull={valuationIsNull}
      marketPrice={valuationData?.marketPrice}
      onCheckAgain={refetchValuation}
    />
  )

  // Guards the two setState calls in handleSave's success path from firing
  // after the user has navigated away — the same gap CreateListingPage's
  // POST and ListingDetailPage's handleMessageSeller guard.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  async function handleSave(event) {
    event.preventDefault()
    // Guards re-entrancy at the operation, not the control: after a
    // failure both the button and ErrorNotice's "Try again" call this
    // handler, and only the button gets `disabled` from `saving`.
    if (saving) return

    const field = editSubmitBlock(draft)
    setBlockedField(field)
    setSaveError(null)
    if (field) {
      askingPriceRef.current?.focus()
      return
    }

    setSaving(true)
    try {
      await apiPatch(`/api/listings/${encodeURIComponent(id)}`, buildUpdateRequest(draft))
      if (!mountedRef.current) return
      // replace: true so Back never returns to a spent edit form; no
      // refetch on success — this page unmounts on navigate, so there is
      // nothing left here to refresh.
      navigate('/listings/mine', { replace: true })
    } catch (err) {
      if (!mountedRef.current) return
      setSaveError(err)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{editListingPageHeading}</PageHeading>
      {listing && (
        <p className="text-sm text-zinc-600">
          {editListingSubline(listing.cardName, listing.condition, listing.printing)}
        </p>
      )}

      <div role="status" aria-live="polite">
        {showLoading && <p className="text-sm text-zinc-600">{loadingMyListingsText}</p>}
        {saving && <p className="text-sm text-zinc-600">{savingChangesText}</p>}
      </div>

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

      {loaded && gate !== null && (
        <EmptyState heading={gateMessage.heading} body={gateMessage.body}>
          <TextLink to="/listings/mine">{myListingsLinkLabel}</TextLink>
        </EmptyState>
      )}

      {loaded && gate === null && (
        <>
          <form onSubmit={handleSave} className="space-y-4 rounded border border-zinc-200 p-4">
            <h2 className="text-base font-medium text-zinc-900">{editListingDetailsHeading}</h2>
            <p className="text-sm text-zinc-700">{editFixedFieldsNote}</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Plain text + inputMode="decimal", not a native numeric
                  input — ListingDetailsForm's asking-price field uses the
                  same shape, for the same reason: a numeric input reads
                  back '' the moment the browser can't sanitize what was
                  typed. */}
              <FormField id="askingPrice" label={askingPriceFieldLabel}>
                <input
                  ref={askingPriceRef}
                  id="askingPrice"
                  type="text"
                  inputMode="decimal"
                  value={draft.askingPrice}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, askingPrice: event.target.value }))
                  }
                  aria-describedby={valuationSettled ? askingPriceHintId : undefined}
                  className={FIELD_CONTROL_CLASS}
                />
              </FormField>
            </div>

            {/* Deliberately outside the role="status" live region — same
                reasoning as ListingDetailsForm's slot: it changes on every
                condition/printing settle (here, on load), and announcing
                it would interrupt the form for advisory information. */}
            {valuationHint}

            <FormField
              id="description"
              label={descriptionFieldLabel}
              hint={descriptionHint(draft.description.length)}
            >
              <textarea
                id="description"
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                aria-describedby={hintIdFor('description')}
                className={FIELD_CONTROL_CLASS}
              />
            </FormField>

            <PrimaryButton type="submit" disabled={saving}>
              Save changes
            </PrimaryButton>

            {blockedField && (
              <p className="text-sm text-zinc-700">{submitBlockMessage(blockedField)}</p>
            )}

            {saveError && <ErrorNotice message={saveError.message} onRetry={handleSave} />}
          </form>

          <TextLink to="/listings/mine">{backToMyListingsLabel}</TextLink>
        </>
      )}
    </div>
  )
}

export default EditListingPage
