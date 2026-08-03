import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import { apiPost } from '../api/client'
import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'
import ImageGallery from '../components/ImageGallery'
import PriceBlock from '../components/PriceBlock'
import ErrorNotice from '../components/ErrorNotice'
import PrimaryButton from '../components/PrimaryButton'
import { conditionPrintingLabel } from '../lib/listings'
import { readBackTo } from '../helpers/detail/backTo'
import { messageSellerSignedOutCopy, ownListingCopy } from '../helpers/messaging/copy'

// Label + value row for a single fact (Description, Seller, Location).
// Defined locally rather than extracted — same precedent as FilterBar's
// TextFilterField/SelectFilterField, which live beside their one consumer.
function Fact({ label, children }) {
  return (
    <div>
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="text-sm text-zinc-900">{children}</p>
    </div>
  )
}

function ListingDetailPage({ authStatus, user }) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const headingRef = useRef(null)

  // useParams() returns id already URL-decoded, so a value like "a/b"
  // would otherwise splice extra path segments into the request URL.
  // Re-encoding here is what keeps the request scoped to a single segment.
  const path = `/api/listings/${encodeURIComponent(id)}`
  const { data, loading, error, refetch } = useFetch(path)

  const loaded = !loading && !error && data !== null

  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)

  // React Router does not remount this component when only :id changes
  // (same fact ConversationThreadPage's renderedId guards against), so a
  // hypothetical future link from one listing straight to another would
  // otherwise carry a stuck "starting" or a stale error across. Not reachable
  // today — nothing currently links /listings/:a -> /listings/:b directly —
  // but useFetch on this same page already resets its own state on [path],
  // and this keeps the mutation state consistent with that rather than being
  // the one piece of state that doesn't. Guarded adjust-during-render, not a
  // useEffect, for the same reason as ConversationThreadPage: an effect would
  // paint one stale frame under the new id before correcting it.
  const [messageSellerListingId, setMessageSellerListingId] = useState(id)
  if (messageSellerListingId !== id) {
    setMessageSellerListingId(id)
    setStarting(false)
    setStartError(null)
  }

  // Tracks whether this component is still mounted across the `await` below.
  // setState on an unmounted component is a harmless no-op in React 18+, but
  // `navigate` is not a state update and always runs — without this check it
  // would still fire after the user has moved elsewhere, yanking them onto a
  // conversation thread with no explanation. Mirrors the
  // controller.signal.aborted checks useAuthStatus and useFetch use for the
  // same class of gap.
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

  // A retry re-runs this same POST rather than doing anything special: a
  // duplicate is safe because the server returns the existing conversation
  // with 200 rather than erroring (BACKEND.md), so a second attempt after a
  // failure never creates a second conversation for this listing.
  async function handleMessageSeller() {
    // Guards re-entrancy at the operation, not the control: after a failure
    // both the button and ErrorNotice's "Try again" call this handler, and
    // only the button gets `disabled` from `starting`.
    if (starting) return
    setStartError(null)
    setStarting(true)
    try {
      const conversation = await apiPost('/api/conversations', { listingId: id })
      if (!mountedRef.current) return
      // No refetch on success: this page unmounts on navigate, so there is
      // nothing left here for CLAUDE.md's "re-invoke the relevant fetch" to
      // refresh.
      navigate(`/conversations/${conversation.id}`)
    } catch (err) {
      if (!mountedRef.current) return
      setStartError(err)
      setStarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <TextLink to={readBackTo(location.state)}>Back to browse</TextLink>

      <PageHeading ref={headingRef}>{data?.cardName ?? 'Listing'}</PageHeading>

      {/* Unlike BrowsePage, this page has no summary line to share the live
          region with — a single listing has nothing left to count. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listing…</p>}
        {starting && <p className="text-sm text-zinc-600">Starting conversation…</p>}
      </div>

      {error && (
        <ErrorNotice
          message={error.message}
          onRetry={() => {
            refetch()
            focusPageHeading()
          }}
        />
      )}

      {loaded && (
        <div className="grid gap-6 md:grid-cols-2">
          <ImageGallery imageUrls={data.imageUrls} cardName={data.cardName} />

          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              {conditionPrintingLabel(data.condition, data.printing)}
            </p>

            <PriceBlock
              askingPrice={data.askingPrice}
              marketPrice={data.marketPrice}
              priceFlagged={data.priceFlagged}
            />

            {/* Action row: "Message seller", then owner actions (edit,
                delete, reactivate), in that order. Owner actions are
                deliberately omitted this cycle — read-only. */}
            <div className="space-y-2">
              {authStatus === 'signedOut' && (
                // The header owns the only Sign in control (CLAUDE.md's auth
                // boundary) — this points at it rather than rendering one.
                <p className="text-sm text-zinc-600">{messageSellerSignedOutCopy}</p>
              )}

              {authStatus === 'signedIn' && data.sellerId === user?.id && (
                <p className="text-sm text-zinc-600">{ownListingCopy}</p>
              )}

              {authStatus === 'signedIn' && data.sellerId !== user?.id && (
                <PrimaryButton disabled={starting} onClick={handleMessageSeller}>
                  Message seller
                </PrimaryButton>
              )}

              {startError && (
                // Renders 401/404/422 identically, verbatim from the server
                // (CLAUDE.md: no branching on status code). The 422
                // (self-conversation) case is unreachable from this UI once
                // the own-listing check above hides the button, but it stays
                // wired: the server is the real enforcement, and an identity
                // that goes stale between page load and click must not fall
                // through to a blank screen.
                <ErrorNotice message={startError.message} onRetry={handleMessageSeller} />
              )}
            </div>

            <Fact label="Description">
              {data.description === null ? (
                <span className="text-zinc-600">No description</span>
              ) : (
                <span className="whitespace-pre-line break-words">{data.description}</span>
              )}
            </Fact>
            <Fact label="Seller">{data.sellerUsername}</Fact>
            <Fact label="Location">{data.location}</Fact>
          </div>
        </div>
      )}
    </div>
  )
}

export default ListingDetailPage
