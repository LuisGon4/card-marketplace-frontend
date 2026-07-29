import Header from './Header'

// The single container every page inherits (CLAUDE.md "Structure", plan §3
// Layout). `children` composition is used rather than <Outlet /> so this
// component stays a plain, reusable wrapper that doesn't assume it's only
// ever rendered from a route element — App.jsx decides the routing, this
// component just owns the shell.
//
// `authStatus` passes straight through to Header — App owns the probe
// (useAuthStatus), this component is just the pipe (plan §5 Step 6: no
// context, no global store).
function AppLayout({ children, authStatus }) {
  return (
    <>
      <Header authStatus={authStatus} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  )
}

export default AppLayout
