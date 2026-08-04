// The page <h1> treatment. `ref` is a plain prop (React 19 — no forwardRef
// needed), created by the page and forwarded straight to the DOM node so a
// page can move focus here after a button the user just clicked unmounts
// itself.
function PageHeading({ ref, children }) {
  return (
    <h1
      ref={ref}
      // tabIndex={-1} is not a tab stop; it exists so a page's
      // focusPageHeading can land here. Removing it silently reintroduces
      // the focus-to-<body> bug.
      tabIndex={-1}
      className="text-2xl font-semibold text-zinc-900"
    >
      {children}
    </h1>
  )
}

export default PageHeading
