// An <img> in the listing frame, or the "No image" placeholder when `src`
// is null. What triggers a null src — an absent thumbnailUrl, an empty
// imageUrls array — is the caller's business; this component knows one rule.
function ListingImage({ src, alt, loading }) {
  if (src === null) {
    // bg-zinc-50 is the "nothing here" surface; the bg-zinc-100 below
    // is the letterbox behind a real image.
    return (
      <div className="flex aspect-square items-center justify-center bg-zinc-50 text-sm text-zinc-600">
        No image
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className="aspect-square w-full bg-zinc-100 object-contain"
    />
  )
}

export default ListingImage
