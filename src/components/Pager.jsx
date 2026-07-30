import SecondaryButton from './SecondaryButton'

// The browse page's Previous / "Page X of Y" / Next row. BrowsePage renders
// this unconditionally alongside its loading/error/empty/populated content,
// so the control row never appears, disappears, or jumps as those states
// toggle. `page` is always known from the URL; `totalPages` is only known
// once a response has landed.
function Pager({ page, totalPages, hasNext, onGoToPage }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <SecondaryButton disabled={page === 0} onClick={() => onGoToPage(page - 1)}>
        Previous
      </SecondaryButton>
      <span className="text-sm text-zinc-700">
        {/* Same guard as summaryText's: totalPages === 0 (empty catalogue)
            is a real number, not a missing one, and "Page 1 of 0" is just
            as nonsensical here as it is there — fall back to the em dash
            for "unknown" and "zero" alike. */}
        Page {page + 1} of {totalPages ? totalPages : '—'}
      </span>
      <SecondaryButton disabled={!hasNext} onClick={() => onGoToPage(page + 1)}>
        Next
      </SecondaryButton>
    </div>
  )
}

export default Pager
