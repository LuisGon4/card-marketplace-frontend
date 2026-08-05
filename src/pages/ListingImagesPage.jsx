import { useRef } from 'react'
import { useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import PageHeading from '../components/PageHeading'
import TextLink from '../components/TextLink'
import ErrorNotice from '../components/ErrorNotice'
import ImageGallery from '../components/ImageGallery'
import EmptyState from '../components/EmptyState'
import {
  imagesPageHeading,
  loadingListingText,
  emptyPhotosCopy,
  nonOwnerUploadCopy,
  doneViewListingLabel,
} from '../helpers/sell/copy'

// Reads a listing's existing photos and gates the upload slot on
// ownership. The upload form itself is not built yet — this page only
// proves the read path works before anything depends on it writing.
function ListingImagesPage({ authStatus, user }) {
  const { id } = useParams()
  const headingRef = useRef(null)

  // useParams() returns id already URL-decoded — re-encoding here is what
  // keeps the request scoped to a single path segment (ListingDetailPage
  // does the same).
  const path = `/api/listings/${encodeURIComponent(id)}`
  const { data, loading, error, refetch } = useFetch(path)

  const loaded = !loading && !error && data !== null
  // Exact id comparison, never a username match — the same rule
  // ListingDetailPage's own-listing check uses.
  const isOwner = authStatus === 'signedIn' && data?.sellerId === user?.id

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <PageHeading ref={headingRef}>{imagesPageHeading}</PageHeading>

      {loaded && (
        <p className="text-sm text-zinc-700">
          <TextLink to={`/listings/${id}`}>{data.cardName}</TextLink>
        </p>
      )}

      {loading && <p className="text-sm text-zinc-600">{loadingListingText}</p>}

      {/* Reserved for the upload stage lines that land next; the listing
          fetch's own loading state renders above rather than sharing this
          region, since this region will only ever announce those three
          lines. */}
      <div role="status" aria-live="polite" />

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
          {data.imageUrls.length > 0 ? (
            <ImageGallery imageUrls={data.imageUrls} cardName={data.cardName} />
          ) : (
            <EmptyState heading={emptyPhotosCopy.heading} body={emptyPhotosCopy.body} />
          )}

          {/* The upload form fills this slot once it exists; a non-owner
              gets this line instead, kept wired now so it isn't mistaken
              for dead code once the form lands beside it. The server
              remains the real enforcement either way. */}
          {!isOwner && <p className="text-sm text-zinc-700">{nonOwnerUploadCopy}</p>}

          <TextLink to={`/listings/${id}`}>{doneViewListingLabel}</TextLink>
        </>
      )}
    </div>
  )
}

export default ListingImagesPage
