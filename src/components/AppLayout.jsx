import Header from './Header'
import Footer from './Footer'

// The single container every page inherits (CLAUDE.md "Structure").
// `children` composition is used rather than <Outlet /> so this component
// stays a plain, reusable wrapper that doesn't assume it's only ever
// rendered from a route element — App.jsx decides the routing, this
// component just owns the shell.
//
// `authStatus` and `user` pass straight through to Header — App owns the
// probe (useAuthStatus), this component is just the pipe: no context, no
// global store.
function AppLayout({ children, authStatus, user }) {
  return (
    // min-h-screen + flex-col + flex-1 on <main> is what keeps the footer at
    // the bottom of a short page instead of floating mid-viewport. <main>
    // needs w-full because in a flex column mx-auto no longer stretches it.
    <div className="flex min-h-screen flex-col">
      <Header authStatus={authStatus} user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  )
}

export default AppLayout
