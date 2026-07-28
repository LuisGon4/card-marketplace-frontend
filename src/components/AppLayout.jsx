import Header from './Header'

// The single container every page inherits (CLAUDE.md "Structure", plan §3
// Layout). `children` composition is used rather than <Outlet /> so this
// component stays a plain, reusable wrapper that doesn't assume it's only
// ever rendered from a route element — App.jsx decides the routing, this
// component just owns the shell.
function AppLayout({ children }) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  )
}

export default AppLayout
