// The bordered-white button reused across the browse page: Try again, Back
// to first page, Clear all filters, FilterBar's Clear all, and the pager's
// Previous/Next — six pasted copies of one class string. Always
// type="button" (none of these submit a form). The disabled: pair is inert
// on the four callers that never pass `disabled`, and is what the pager's
// two need. `ref` is a plain prop (React 19 — no forwardRef needed),
// mirroring PrimaryButton and PageHeading — owner-actions' delete/reactivate
// trigger uses it to restore focus once its mutation settles. `...rest`
// spreads onto the button so a disclosure trigger can carry
// aria-expanded/aria-controls/aria-describedby without a second button
// component; it is spread before the explicit props so none of them can be
// overridden by an accidental collision.
function SecondaryButton({ ref, disabled, onClick, children, ...rest }) {
  return (
    <button
      {...rest}
      ref={ref}
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
