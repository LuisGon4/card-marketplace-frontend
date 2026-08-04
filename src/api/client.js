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

// Exported so callers that need the API origin outside of an HTTP request —
// e.g. the OAuth redirect, which is a `window.location` assignment, not a
// fetch — read it from the same source instead of re-parsing the env var
// (and risking a hardcoded host drifting in). This does not change any
// request behavior above.
export const API_BASE_URL = BASE_URL

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

// apiPost is now exercised by the conversation-start flow (POST
// /api/conversations). apiPatch and apiDelete are still unexercised —
// TODO(Luis): review before their first mutation ships (edit/delete/
// reactivate listing, image upload).
//
// Open item for review: when the XSRF-TOKEN cookie is absent, `request`
// above omits the header and sends the write anyway, which 403s in prod
// with nothing indicating a missing token caused it. GET /api/csrf exists
// to prime the cookie and is called from nowhere.
export function apiPost(path, body, { signal } = {}) {
  return request('POST', path, { signal, body })
}

export function apiPatch(path, body, { signal } = {}) {
  return request('PATCH', path, { signal, body })
}

export function apiDelete(path, { signal } = {}) {
  return request('DELETE', path, { signal })
}
