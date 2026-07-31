import { useState } from 'react'
import ListingImage from './ListingImage'
import { imageAlt, thumbnailLabel } from '../helpers/detail/copy'

// Main image plus a clickable thumbnail strip. Owns the selected index.
function ImageGallery({ imageUrls, cardName }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Clamped on read, not synced in an effect: a "Try again" refetch can
  // return a shorter imageUrls list than the one that produced
  // selectedIndex, and clamping here beats an effect or a `key` prop —
  // same philosophy as helpers/browse/searchParams.js clamping URL params
  // on read. Math.max(0, …) is what keeps an empty list from giving -1.
  const selected = Math.max(0, Math.min(selectedIndex, imageUrls.length - 1))

  return (
    <div>
      {/* No loading="lazy" here: this is the largest above-the-fold
          image at every breakpoint, unlike the thumbnails below. */}
      <ListingImage
        src={imageUrls[selected] ?? null}
        alt={imageAlt(cardName, selected, imageUrls.length)}
      />

      {/* A strip of one image would be a tab stop whose only effect is
          re-selecting what's already selected, so it renders only once
          there's an actual choice to make. No role="region" around the
          strip and no live region on the main image above — the button
          names already carry the context, and announcing every swap would
          just be chatter. */}
      {imageUrls.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imageUrls.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={thumbnailLabel(index, imageUrls.length)}
              // aria-pressed, not aria-selected: the latter is only valid
              // inside a tablist, and the full APG tabs pattern would
              // demand roving tabindex and arrow-key handling for a
              // handful of images. Every thumbnail stays an ordinary tab
              // stop instead.
              aria-pressed={index === selected}
              // Selection is two-signal (WCAG 1.4.1: not colour-alone) —
              // aria-pressed plus this border. Both states are border-2,
              // never border vs border-2, so selecting a thumbnail never
              // shifts layout by a pixel.
              className={`rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                index === selected ? 'border-2 border-blue-700' : 'border-2 border-zinc-200'
              }`}
            >
              {/* alt="" is deliberate: the button's aria-label already
                  names this image, and a second alt would be announced
                  twice. */}
              <img
                src={url}
                alt=""
                loading="lazy"
                className="aspect-square w-16 bg-zinc-100 object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageGallery
