// This module implements the API contract in BACKEND.md §2-3 — see
// CLAUDE.md "API access" for the one-module-per-host rule. It is the only
// module in the app that calls fetch for that contract. src/api/s3.js is
// the one sanctioned exception: the presigned S3 PUT is not an API call —
// different host, and the signature is the credential, so it must send
// neither cookies nor CSRF. Any new API call still belongs in this file.

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

// apiPost is exercised by the conversation-start flow (POST
// /api/conversations) and, from the create-listing cycle, by
// POST /api/listings. apiPatch and apiDelete are exercised by the edit,
// delete and reactivate listing flows.
//
// Ruled on by Luis, 2026-08-03: when the XSRF-TOKEN cookie is absent,
// `request` above omits the header and sends the write anyway, which 403s
// in prod with nothing indicating a missing token caused it. This stays
// deliberately unguarded and GET /api/csrf stays uncalled — the dev profile
// accepts anonymous writes with no XSRF cookie at all, so a client-side
// guard would break every flow that currently works locally, and it would
// invent a failure mode the contract does not describe. Not an open
// question; a recorded decision.
//
// src/api/s3.js is the one sanctioned fetch outside this module — see this
// file's header comment.
export function apiPost(path, body, { signal } = {}) {
  return request('POST', path, { signal, body })
}

export function apiPatch(path, body, { signal } = {}) {
  return request('PATCH', path, { signal, body })
}

export function apiDelete(path, { signal } = {}) {
  return request('DELETE', path, { signal })
}
