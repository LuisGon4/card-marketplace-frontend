import TextLink from './TextLink'

function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4">
        {/* Labelled because the header's banner nav and this one are otherwise
            indistinguishable to anyone listing the page's landmarks. */}
        <nav aria-label="Legal" className="flex items-center gap-6">
          <TextLink to="/terms">Terms</TextLink>
          <TextLink to="/privacy">Privacy</TextLink>
        </nav>
        <span className="text-sm text-zinc-600">&copy; 2026 CardsLocal</span>
      </div>
    </footer>
  )
}

export default Footer
