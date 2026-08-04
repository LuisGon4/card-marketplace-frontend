// The filled blue action button. Unlike SecondaryButton, `type` is a real
// prop with a `button` default: this component's callers split
// two-submit / one-button, so hardcoding `type="button"` would break the
// submit callers.
function PrimaryButton({ type = 'button', disabled, onClick, children }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export default PrimaryButton
