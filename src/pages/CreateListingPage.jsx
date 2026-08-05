import PageHeading from '../components/PageHeading'
import EmptyState from '../components/EmptyState'
import {
  pageHeading,
  choosePanelHeading,
  describePanelHeading,
  signedOutSellCopy,
} from '../helpers/sell/copy'

// Ships the shell only: the heading, the one live region, the signed-out
// state, and both panels empty. Card search, valuation, the details
// fields, and the POST arrive with the steps that render them.
function CreateListingPage({ authStatus }) {
  const isSignedIn = authStatus === 'signedIn'

  return (
    <div className="space-y-6">
      <PageHeading>{pageHeading}</PageHeading>

      <div role="status" aria-live="polite" />

      {/* The header owns the only Sign in control (CLAUDE.md's auth
          boundary) — this points at it rather than rendering one. */}
      {authStatus === 'signedOut' && (
        <EmptyState heading={signedOutSellCopy.heading} body={signedOutSellCopy.body} />
      )}

      {isSignedIn && (
        <>
          <section className="space-y-4 rounded border border-zinc-200 p-4">
            <h2 className="text-base font-medium text-zinc-900">{choosePanelHeading}</h2>
          </section>

          <section className="space-y-4 rounded border border-zinc-200 p-4">
            <h2 className="text-base font-medium text-zinc-900">{describePanelHeading}</h2>
          </section>
        </>
      )}
    </div>
  )
}

export default CreateListingPage
