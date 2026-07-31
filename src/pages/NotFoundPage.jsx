import TextLink from '../components/TextLink'

function NotFoundPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Page not found</h1>
      <p className="text-sm text-zinc-700">
        There&rsquo;s nothing here. Check the address, or{' '}
        <TextLink to="/">go back to browsing</TextLink>.
      </p>
    </div>
  )
}

export default NotFoundPage
