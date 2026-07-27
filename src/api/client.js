// The only module in the app that calls fetch. See CLAUDE.md "API access"
// and BACKEND.md §2-3 for the contract this module implements.

// Read once at module load. If this is missing, every request would silently
// resolve against the Vite dev origin and 404 in a confusing way — fail loud
// instead.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
if (!BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Add it to .env (see BACKEND.md) — requests cannot be built without it.'
  )
}

/** Thrown for any non-2xx response. `.message` is the server's plain-text body. */
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readCookie(name) {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
  if (!match) return null
  return decodeURIComponent(match.slice(name.length + 1))
}

const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

async function request(method, path, { signal, body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // CSRF token is read fresh per call, never cached — it rotates after login
  // (BACKEND.md §3). GETs are exempt.
  if (WRITE_METHODS.has(method)) {
    const csrfToken = readCookie('XSRF-TOKEN')
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include', // session is an HttpOnly cookie — required on every request
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  // Error bodies are plain text (CLAUDE.md, BACKEND.md §2), never JSON — read
  // with response.text(), never response.json(), on a non-2xx response.
  if (!response.ok) {
    const text = await response.text()
    throw new ApiError(response.status, text || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}

/** GET request. `path` includes the query string, e.g. '/api/listings?page=0'. */
export function apiGet(path, { signal } = {}) {
  return request('GET', path, { signal })
}

// Write helpers below are unexercised this cycle — the homepage makes no
// mutations. TODO(Luis): review before the first mutation ships (create/edit
// listing, image upload, conversations, etc.).
export function apiPost(path, body, { signal } = {}) {
  return request('POST', path, { signal, body })
}

export function apiPatch(path, body, { signal } = {}) {
  return request('PATCH', path, { signal, body })
}

export function apiDelete(path, { signal } = {}) {
  return request('DELETE', path, { signal })
}
