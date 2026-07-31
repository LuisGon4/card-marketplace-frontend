import { Link } from 'react-router'

// The app's standard inline text link — an underlined link inside a line of
// prose, as opposed to a button-styled action like SecondaryButton.
function TextLink({ to, children }) {
  return (
    <Link
      to={to}
      className="text-blue-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      {children}
    </Link>
  )
}

export default TextLink
