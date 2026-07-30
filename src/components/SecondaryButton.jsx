// The bordered-white button reused across the browse page: Try again, Back
// to first page, Clear all filters, FilterBar's Clear all, and the pager's
// Previous/Next — six pasted copies of one class string. Always
// type="button" (none of these submit a form). The disabled: pair is inert
// on the four callers that never pass `disabled`, and is what the pager's
// two need.
function SecondaryButton({ disabled, onClick, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export default SecondaryButton
