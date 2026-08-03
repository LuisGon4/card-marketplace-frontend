import { useRef } from 'react'
import { useLocation, useParams } from 'react-router'
import { useFetch } from '../hooks/useFetch'
import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'
import ImageGallery from '../components/ImageGallery'
import PriceBlock from '../components/PriceBlock'
import ErrorNotice from '../components/ErrorNotice'
import { conditionPrintingLabel } from '../lib/listings'
import { readBackTo } from '../helpers/detail/backTo'

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

function ListingDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const headingRef = useRef(null)

  // useParams() returns id already URL-decoded, so a value like "a/b"
  // would otherwise splice extra path segments into the request URL.
  // Re-encoding here is what keeps the request scoped to a single segment.
  const path = `/api/listings/${encodeURIComponent(id)}`
  const { data, loading, error, refetch } = useFetch(path)

  const loaded = !loading && !error && data !== null

  function focusPageHeading() {
    headingRef.current?.focus()
  }

  return (
    <div className="space-y-6">
      <TextLink to={readBackTo(location.state)}>Back to browse</TextLink>

      <PageHeading ref={headingRef}>{data?.cardName ?? 'Listing'}</PageHeading>

      {/* Unlike BrowsePage, this page has no summary line to share the live
          region with — a single listing has nothing left to count. */}
      <div role="status" aria-live="polite">
        {loading && <p className="text-sm text-zinc-600">Loading listing…</p>}
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
                delete, reactivate), in that order. Deliberately omitted
                this cycle — read-only. */}

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
