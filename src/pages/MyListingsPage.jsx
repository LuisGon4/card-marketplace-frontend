import { useEffect, useRef, useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { apiDelete, apiPatch } from '../api/client'
import { hintIdFor } from '../lib/fields'
import { editGate } from '../helpers/sell/gates'
import ListingCard from '../components/ListingCard'
import PageHeading from '../components/PageHeading'
import ErrorNotice from '../components/ErrorNotice'
import EmptyState from '../components/EmptyState'
import SecondaryButton from '../components/SecondaryButton'
import TextLink from '../components/TextLink'
import {
  cancelDeleteLabel,
  confirmDeleteLabel,
  deleteConfirmExplanation,
  deleteListingLabel,
  emptyMyListingsCopy,
  listingStatusLine,
  loadingMyListingsText,
  myListingsPageHeading,
  myListingsSummary,
  pendingActionText,
  reactivateListingLabel,
  signedOutMyListingsCopy,
} from '../helpers/sell/copy'

// DELETE and the reactivate PATCH both return 204 — client.js already
// returns null without parsing it, so neither branch here has a response
// body to read. One definition of both endpoints so the id and the URL
// shape can't drift between the confirm-delete path and the retry path.
function buildActionRequest(id, action) {
  return action === 'deleting'
    ? () => apiDelete(`/api/listings/${encodeURIComponent(id)}`)
    : () => apiPatch(`/api/listings/${encodeURIComponent(id)}/reactivate`)
}

// One row per ListingSummaryResponse (BACKEND.md), plus the status line
// every row carries. `backTo` is deliberately not passed to ListingCard:
// ListingDetailPage's back link always reads "Back to browse" and points at
// "/", and feeding a /listings/mine backTo here would make that label lie.
// `linkTitle={listing.isActive}` is a rendering fact, not a gate — an
// inactive listing simply has no detail page to link to.
function MyListingRow({
  listing,
  isConfirming,
  rowError,
  triggerRef,
  confirmYesRef,
  onToggleStatus,
  onConfirmDelete,
  onCancelDelete,
  onRetryAction,
}) {
  const confirmId = hintIdFor(`delete-${listing.id}`)
  const explanationId = hintIdFor(`delete-${listing.id}-explanation`)

  return (
    <li className="space-y-2">
      <ListingCard {...listing} linkTitle={listing.isActive} />
      <p className="text-sm text-zinc-700">{listingStatusLine(listing.isActive)}</p>

      <div className="flex flex-wrap items-center gap-2">
        {/* editGate, never a local listing.isActive test — the row's link
            asks the same question EditListingPage's gate branch and its
            message key answer, so all three can't name different cases. */}
        {editGate(listing) === null && (
          <TextLink to={`/listings/${listing.id}/edit`}>Edit details</TextLink>
        )}

        {/* One element whose label follows isActive, never two
            conditionally-rendered buttons. React would in fact reuse this
            same DOM node across the ternary today, but a later edit (a key,
            a wrapper around one branch) can silently split it in two — and
            the symptom, focus dropping to <body> right after a successful
            delete, won't look connected to that change. This button is
            also never `disabled`: it is the focus-restore target below,
            and a focused element that goes disabled drops focus to <body>
            in Chromium. Re-entrancy is guarded inside the handlers
            instead. */}
        <SecondaryButton
          ref={triggerRef}
          aria-expanded={listing.isActive ? isConfirming : undefined}
          aria-controls={listing.isActive ? confirmId : undefined}
          onClick={onToggleStatus}
        >
          {listing.isActive ? deleteListingLabel : reactivateListingLabel}
        </SecondaryButton>
      </div>

      {isConfirming && (
        // aria-expanded/aria-controls above, and this block itself, exist
        // only on the active (delete) branch — reactivating discloses
        // nothing, so it never grows a confirm block. Honest asymmetry, not
        // an oversight.
        <div id={confirmId} className="space-y-2">
          <p id={explanationId} className="text-sm text-zinc-700">
            {deleteConfirmExplanation}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton ref={confirmYesRef} aria-describedby={explanationId} onClick={onConfirmDelete}>
              {confirmDeleteLabel}
            </SecondaryButton>
            <SecondaryButton onClick={onCancelDelete}>{cancelDeleteLabel}</SecondaryButton>
          </div>
        </div>
      )}

      {rowError && <ErrorNotice message={rowError.message} onRetry={onRetryAction} />}
    </li>
  )
}

function MyListingsPage({ authStatus }) {
  const headingRef = useRef(null)
  // The one ref for the row currently under focus management — attached to
  // whichever button needs it: the confirm's "Yes, delete listing" while
  // confirmingId is open, or the trigger once we're restoring focus to it.
  // Only one row is ever in either state at a time, so one ref suffices.
  const statusButtonRef = useRef(null)
  const isSignedIn = authStatus === 'signedIn'

  // useFetch already accepts null and clears on the way down — skips the
  // request while signed out or still checking.
  const { data, error, refetch } = useFetch(isSignedIn ? '/api/listings/mine' : null)

  // Merged into local state rather than rendered from useFetch's `data`
  // directly: useFetch nulls `data` at the start of every request, including
  // the post-mutation refetch() below, and rendering that null would unmount
  // the whole <ul> mid-settle — taking the very status button focusRowId was
  // just pointed at down with it, and dropping focus to <body>. Same hazard
  // and same remedy as ListingImagesPage's merge effect.
  const [listings, setListings] = useState([])
  const [listingsLoadedOnce, setListingsLoadedOnce] = useState(false)

  useEffect(() => {
    if (data === null) return
    // Syncing local state to a prop-like input (the latest fetched list),
    // not an accidental render cascade — see useFetch.js and
    // ListingImagesPage's identical merge effect for the same case.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setListings(data)
    setListingsLoadedOnce(true)
  }, [data])

  const [confirmingId, setConfirmingId] = useState(null)
  // The row whose mutation is in flight, or null: { id, action }, where
  // action is 'deleting' | 'reactivating'. Guards re-entrancy and drives
  // the live region's in-flight line.
  const [pending, setPending] = useState(null)
  // The most recent action's error, scoped to its row: { id, action, error }
  // or null. Singular, not a per-row map — only one action is ever in
  // flight at a time, so only one error can exist at a time, which is what
  // keeps this page at exactly one role="alert".
  const [actionError, setActionError] = useState(null)
  // The row whose trigger button should regain focus once it's safe — set
  // right before closing a confirm (success, failure, or cancel) and
  // consumed by the effect below once that render commits.
  const [focusRowId, setFocusRowId] = useState(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Opening a confirm moves focus into it — the "Yes, delete listing"
  // button doesn't exist until this render commits, so it can't be focused
  // synchronously from the click handler.
  useEffect(() => {
    if (confirmingId !== null) {
      statusButtonRef.current?.focus()
    }
  }, [confirmingId])

  // Confirming, cancelling, and a failed action all return focus to the
  // trigger — deferred the same way, so it runs once the confirm block's
  // buttons have actually left the DOM rather than racing that removal.
  // focusRowId is reset to null *before* each place that later sets it to a
  // row id — handleToggleStatus, before opening a confirm, and
  // performAction, before it starts a mutation — so this effect always sees
  // a real null -> id transition and reliably re-fires, rather than a
  // same-value set React would bail out of. handleCancelDelete sets it
  // without clearing it first; it relies on the open-confirm branch above
  // having already cleared it, since a confirm can't be cancelled without
  // having been opened. It is never cleared *here*,
  // inside the effect itself, because that would be a setState call from an
  // effect body, which eslint-plugin-react-hooks' set-state-in-effect rule
  // (see useFetch.js's own note on it) flags for exactly this file.
  useEffect(() => {
    if (focusRowId !== null) {
      statusButtonRef.current?.focus()
    }
  }, [focusRowId])

  // listingsLoadedOnce, not the hook's own `loading` or `data !== null`:
  // once the list has loaded once, a post-mutation refetch (loading flips
  // true again, data flips null) must not un-load the page — same
  // reasoning as ListingImagesPage's listingLoadedOnce.
  const loaded = isSignedIn && listingsLoadedOnce && !error
  const isEmpty = loaded && listings.length === 0
  const inactiveCount = listings.filter((listing) => !listing.isActive).length
  // "Checking…" folds into the same loading text as the fetch itself —
  // there is nothing meaningful to show until authStatus resolves.
  //
  // Keyed on `!listingsLoadedOnce`, not `loading`: the render where
  // authStatus flips 'checking' -> 'signedIn' commits before useFetch's
  // effect has run for the new path, so `loading` is still false from the
  // `null`-path render that just ended. `listingsLoadedOnce` is still false
  // for that entire render too, so this keeps the loading text up instead of
  // leaving a one-commit gap where nothing renders — and, unlike
  // `data === null`, it also stays false only until the *first* successful
  // load, so a post-mutation refetch doesn't reshow "Loading your
  // listings…" over an already-rendered list. Do not "simplify" this back
  // to `loading` or `data === null`.
  const showLoading = authStatus === 'checking' || (isSignedIn && !listingsLoadedOnce && !error)

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  // Re-entrancy guarded here, not on either button: the trigger and
  // "Yes, delete listing" are never disabled, so a rapid double-click calls
  // this twice — the second call sees `pending` already set and returns.
  async function performAction(id, action, request) {
    if (pending) return
    setActionError(null)
    setPending({ id, action })
    // Cleared here, not just at the end, so the setFocusRowId(id) below is a
    // real null -> id transition even when id already equals the current
    // focusRowId (e.g. reactivating a row whose trigger already holds
    // focus). Without this, React bails out of the identical set and the
    // [focusRowId] effect never re-fires — masked today only because the
    // click itself already focused the button.
    setFocusRowId(null)
    try {
      await request()
      if (!mountedRef.current) return
      setConfirmingId(null)
      setPending(null)
      setFocusRowId(id)
      refetch()
    } catch (err) {
      if (!mountedRef.current) return
      setConfirmingId(null)
      setPending(null)
      setActionError({ id, action, error: err })
      setFocusRowId(id)
    }
  }

  async function handleToggleStatus(listing) {
    if (listing.isActive) {
      // Guarded here too, not just inside performAction: confirmingId is a
      // single page-wide value, and performAction closes it unconditionally
      // once its own mutation settles. Opening a second row's confirm while
      // an earlier one is still in flight would let that settle steal the
      // confirm the user just opened on this row.
      if (pending) return
      // Nothing clears focusRowId between an earlier close and this click,
      // so it can still equal this row's id — opening the confirm without
      // clearing it would attach statusButtonRef to both this row's trigger
      // (via focusRowId) and its "Yes, delete listing" (via confirmingId) at
      // once.
      setFocusRowId(null)
      setConfirmingId(listing.id)
      return
    }
    await performAction(listing.id, 'reactivating', buildActionRequest(listing.id, 'reactivating'))
  }

  async function handleConfirmDelete(id) {
    await performAction(id, 'deleting', buildActionRequest(id, 'deleting'))
  }

  function handleCancelDelete(id) {
    setConfirmingId(null)
    setFocusRowId(id)
  }

  function retryAction() {
    if (!actionError) return
    performAction(actionError.id, actionError.action, buildActionRequest(actionError.id, actionError.action))
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{myListingsPageHeading}</PageHeading>

      <div role="status" aria-live="polite">
        {showLoading && <p className="text-sm text-zinc-600">{loadingMyListingsText}</p>}
        {loaded && (
          <p className="text-sm text-zinc-600">
            {myListingsSummary(listings.length, inactiveCount)}
          </p>
        )}
        {pending && <p className="text-sm text-zinc-600">{pendingActionText(pending.action)}</p>}
      </div>

      {/* No "Refresh" button here, unlike ConversationsPage: a conversation someone
          else opens is invisible until refetched, but nothing outside this page can
          change *your* listings, and any mutation this page performs refetches on
          completion. Don't add one back — there's nothing for it to catch that a
          mutation wouldn't already refresh. */}

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

      {isEmpty && (
        <EmptyState heading={emptyMyListingsCopy.heading} body={emptyMyListingsCopy.body}>
          <TextLink to="/listings/new">Sell a card</TextLink>
        </EmptyState>
      )}

      {loaded && listings.length > 0 && (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <MyListingRow
              key={listing.id}
              listing={listing}
              isConfirming={confirmingId === listing.id}
              rowError={actionError?.id === listing.id ? actionError.error : null}
              triggerRef={focusRowId === listing.id ? statusButtonRef : undefined}
              confirmYesRef={confirmingId === listing.id ? statusButtonRef : undefined}
              onToggleStatus={() => handleToggleStatus(listing)}
              onConfirmDelete={() => handleConfirmDelete(listing.id)}
              onCancelDelete={() => handleCancelDelete(listing.id)}
              onRetryAction={actionError?.id === listing.id ? retryAction : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default MyListingsPage
