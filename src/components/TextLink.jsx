import { Link } from 'react-router'
import { TEXT_LINK_CLASS } from '../lib/links'

// The app's standard inline text link — an underlined link inside a line of
// prose, as opposed to a button-styled action like SecondaryButton.
function TextLink({ to, children }) {
  return (
    <Link to={to} className={TEXT_LINK_CLASS}>
      {children}
    </Link>
  )
}

export default TextLink
