// Clamp-on-read for the back link's navigation state, same philosophy as
// helpers/browse/searchParams.js: router state is set by whoever linked
// here, so it's untrusted the same way a URL param is.
export function readBackTo(state) {
  if (state === null || typeof state !== 'object') return '/'
  const { backTo } = state
  if (typeof backTo !== 'string') return '/'
  // A leading "//" (or "/\", which browsers treat the same way) is a
  // protocol-relative URL: "//evil.com" reads like a path but navigates
  // off-site. Rejecting only "//" and keeping the plain startsWith('/')
  // check would still let "/\evil.com" through, so both prefixes are
  // checked here — do not simplify this back to startsWith('/').
  if (!backTo.startsWith('/')) return '/'
  if (backTo.startsWith('//') || backTo.startsWith('/\\')) return '/'
  return backTo
}
