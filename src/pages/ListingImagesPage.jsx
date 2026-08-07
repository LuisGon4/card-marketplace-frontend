import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import PageHeading from '../components/PageHeading'
import TextLink from '../components/TextLink'
import ErrorNotice from '../components/ErrorNotice'
import ImageGallery from '../components/ImageGallery'
import EmptyState from '../components/EmptyState'
import UploadPhotoPanel from '../components/UploadPhotoPanel'
import {
  imagesPageHeading,
  loadingListingText,
  emptyPhotosCopy,
  nonOwnerUploadCopy,
  doneViewListingLabel,
} from '../helpers/sell/copy'

// Reads a listing's existing photos, gates the upload slot on ownership,
// and composes UploadPhotoPanel for the upload itself.
function ListingImagesPage({ authStatus, user }) {
  const { id } = useParams()
  const headingRef = useRef(null)

  // useParams() returns id already URL-decoded — re-encoding here is what
  // keeps the request scoped to a single path segment (ListingDetailPage
  // does the same).
  const path = `/api/listings/${encodeURIComponent(id)}`
  const { data, loading, error, refetch } = useFetch(path)

  // Merged into local state rather than rendered from useFetch's `data`
  // directly: useFetch nulls `data` at the start of every request,
  // including the post-confirm refetch below, and rendering that null
  // would unmount this whole loaded block mid-upload — destroying the
  // upload panel and any in-flight state it holds. Unlike
  // ConversationThreadPage's per-id merge, this page's :id never changes
  // without a full remount — its only entry point is a `navigate` from a
  // different route (CreateListingPage), never a same-page link to a
  // different listing's images — so there is no stale-id frame to guard
  // against synchronously during render, and a plain effect (not the
  // render-time reset ConversationThreadPage needs for its :id) is enough.
  const [listing, setListing] = useState(null)
  const [listingLoadedOnce, setListingLoadedOnce] = useState(false)

  useEffect(() => {
    if (data === null) return
    // Syncing local state to a prop-like input (the latest fetched
    // listing), not an accidental render cascade — see useFetch.js and
    // ConversationThreadPage's identical merge effect for the same case.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setListing(data)
    setListingLoadedOnce(true)
  }, [data])

  // listingLoadedOnce, not the hook's own `loading`: once the listing has
  // loaded once, a transient refetch (loading flips true again, data flips
  // null) must not un-load the page — same reasoning as
  // ConversationThreadPage's messagesLoaded.
  const loaded = listingLoadedOnce && !error
  // Exact id comparison, never a username match — the same rule
  // ListingDetailPage's own-listing check uses.
  const isOwner = authStatus === 'signedIn' && listing?.sellerId === user?.id

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{imagesPageHeading}</PageHeading>

      {loaded && (
        <p className="text-sm text-zinc-700">
          <TextLink to={`/listings/${id}`}>{listing.cardName}</TextLink>
        </p>
      )}

      {/* Gated on listingLoadedOnce, not the hook's raw `loading`: once the
          listing has loaded once, a post-upload refetch flips `loading`
          true again without this text reappearing over an already-rendered
          gallery. */}
      {!listingLoadedOnce && loading && (
        <p className="text-sm text-zinc-600">{loadingListingText}</p>
      )}

      {/* The page's one live region now lives in UploadPhotoPanel; do not
          add a second one here. */}

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
        <>
          {listing.imageUrls.length > 0 ? (
            <ImageGallery imageUrls={listing.imageUrls} cardName={listing.cardName} />
          ) : (
            <EmptyState heading={emptyPhotosCopy.heading} body={emptyPhotosCopy.body} />
          )}

          {/* A non-owner sees this line instead of the upload panel. The
              server remains the real enforcement either way — this client
              gate is cosmetic. */}
          {isOwner ? (
            <UploadPhotoPanel listingId={id} onUploaded={refetch} />
          ) : (
            <p className="text-sm text-zinc-700">{nonOwnerUploadCopy}</p>
          )}

          <TextLink to={`/listings/${id}`}>{doneViewListingLabel}</TextLink>
        </>
      )}
    </div>
  )
}

export default ListingImagesPage
