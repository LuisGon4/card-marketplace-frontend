// An <img> in the listing frame, or the "No image" placeholder when `src`
// is null. What triggers a null src — an absent thumbnailUrl, an empty
// imageUrls array — is the caller's business; this component knows one rule.
function ListingImage({ src, alt, loading, capped = false }) {
  // capped defaults to false so ImageGallery and browse's ListingCard get
  // today's exact classes. It exists for the caller that needs the square
  // clamped to a fixed max width instead of stretching to a full-width row.
  const capClass = capped ? ' max-w-xs' : ''

  if (src === null) {
    // bg-zinc-50 is the "nothing here" surface; the bg-zinc-100 below
    // is the letterbox behind a real image.
    return (
      <div
        className={`flex aspect-square items-center justify-center bg-zinc-50 text-sm text-zinc-600${capClass}`}
      >
        No image
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={`aspect-square w-full bg-zinc-100 object-contain${capClass}`}
    />
  )
}

export default ListingImage
