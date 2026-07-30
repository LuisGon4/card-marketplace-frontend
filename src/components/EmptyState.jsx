// The browse page's empty-state block: a dashed-border, centered wrapper
// for a heading, a body line, and an optional row of action buttons. Stays
// outside the page's live region and keeps its dashed-border treatment; no
// aria-live / role is added here.
//
// `children` is the action row's buttons. The row renders only when there
// is at least one — some empty-state situations (e.g. an empty catalogue)
// offer no action at all.
function EmptyState({ heading, body, children }) {
  return (
    <div className="space-y-3 border border-dashed border-zinc-300 p-8 text-center">
      <div className="space-y-1">
        <h2 className="break-words text-base font-medium text-zinc-900">{heading}</h2>
        <p className="break-words text-sm text-zinc-600">{body}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-2">{children}</div>
      )}
    </div>
  )
}

export default EmptyState
