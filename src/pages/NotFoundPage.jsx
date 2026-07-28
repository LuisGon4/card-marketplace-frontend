import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Page not found</h1>
      <p className="text-sm text-zinc-700">
        There&rsquo;s nothing here. Check the address, or{' '}
        <Link
          to="/"
          className="text-blue-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          go back to browsing
        </Link>
        .
      </p>
    </div>
  )
}

export default NotFoundPage
