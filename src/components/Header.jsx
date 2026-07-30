import { API_BASE_URL } from '../api/client'

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
// probe (GET /api/listings/mine) is in flight.
function AuthSlot({ authStatus }) {
  if (authStatus === 'signedIn') {
    // Generic text only — there is no username source (TODO(Luis) #3, no
    // /api/users/me). sellerUsername on a listing is the *seller's* name,
    // not the current user's, and a signed-in user with no listings gets
    // `[]` back from the probe anyway.
    return (
      <span className="rounded border border-transparent px-3 py-1.5 text-sm font-medium text-zinc-900">
        Signed in
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

function Header({ authStatus }) {
  return (
    <header className="border-b border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="text-base font-medium text-zinc-900">
          Card Marketplace
        </span>
        <AuthSlot authStatus={authStatus} />
      </div>
    </header>
  )
}

export default Header
