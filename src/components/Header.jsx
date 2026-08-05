import { NavLink } from 'react-router'
import { API_BASE_URL } from '../api/client'
import TextLink from './TextLink'

// Login is a full-page redirect, not an API call — there is no login
// endpoint callable from JS (CLAUDE.md "Auth in the UI", BACKEND.md §3).
// A <button> is used (not an <a>) because the navigation is scripted rather
// than a plain link to a same-app URL.
function handleSignIn() {
  window.location.href = `${API_BASE_URL}/oauth2/authorization/google`
}

// Renders the right-hand auth slot from the three-valued useAuthStatus()
// result. `checking` is a neutral placeholder sized like
// the other two states so resolving it doesn't reflow the header, and it
// deliberately reads as neither "signed in" nor "signed out" while the
// probe (GET /api/users/me) is in flight.
function AuthSlot({ authStatus, user }) {
  if (authStatus === 'signedIn') {
    // user should always be set alongside 'signedIn', but fall back rather
    // than render "Signed in as undefined" if that invariant ever breaks.
    return (
      <span className="rounded border border-transparent px-3 py-1.5 text-sm font-medium text-zinc-900">
        {user ? `Signed in as ${user.username}` : 'Signed in'}
      </span>
    )
  }

  if (authStatus === 'checking') {
    return (
      <span className="rounded border border-transparent px-3 py-1.5 text-sm font-medium text-zinc-600">
        Checking…
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
    >
      Sign in with Google
    </button>
  )
}

function Header({ authStatus, user }) {
  return (
    <header className="border-b border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-6">
          {/* Not wrapped in its own <nav>: the <header> is already a banner
              landmark, and a second navigation landmark would be
              indistinguishable from the one below without labelling both. */}
          <NavLink to="/" className="text-base font-medium text-zinc-900">
            Card Marketplace
          </NavLink>
          {/* Gated on signedIn so it appears in the same tick the auth slot
              resolves, rather than flashing for a signed-out visitor. */}
          {authStatus === 'signedIn' && (
            <nav className="flex items-center gap-6">
              <TextLink to="/listings/new">Sell a card</TextLink>
              <TextLink to="/conversations">Conversations</TextLink>
            </nav>
          )}
        </div>
        <AuthSlot authStatus={authStatus} user={user} />
      </div>
    </header>
  )
}

export default Header
