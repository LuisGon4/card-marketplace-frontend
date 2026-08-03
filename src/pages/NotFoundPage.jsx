import TextLink from '../components/TextLink'
import PageHeading from '../components/PageHeading'

function NotFoundPage() {
  return (
    <div className="space-y-6">
      <PageHeading>Page not found</PageHeading>
      <p className="text-sm text-zinc-700">
        There&rsquo;s nothing here. Check the address, or{' '}
        <TextLink to="/">go back to browsing</TextLink>.
      </p>
    </div>
  )
}

export default NotFoundPage
