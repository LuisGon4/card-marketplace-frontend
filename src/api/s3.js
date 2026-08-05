// The one sanctioned fetch outside client.js (CLAUDE.md "API access"). The
// presigned S3 PUT is not an API call — different host, and the signature
// itself is the credential — so this module must differ from client.js's
// request() in five ways. Four of the five produce an opaque S3 403 if
// unified with request(), which is why this is a comment and not a
// footnote:
//
// 1. Absolute URL — the presigned uploadUrl the server returns, never
//    BASE_URL + path.
// 2. Raw File body — the exact bytes S3 signed, never JSON.stringify.
// 3. Content-Type: image/jpeg, hardcoded from BACKEND.md's contract, never
//    read from file.type. The presigned URL signs this header, and a
//    mismatch is a hard 403 SignatureDoesNotMatch whose body says nothing
//    about why. fetch sets Content-Type from a File's own .type when the
//    caller omits it, so leaving this unset is not an option — a user who
//    defeats accept="image/jpeg" and picks a PNG would otherwise send
//    image/png and break the signature (accepted risk, see
//    ListingImagesPage.jsx's runUpload).
// 4. credentials: 'omit', explicitly, and no X-XSRF-TOKEN. The signature is
//    the only credential this request carries; sending either the session
//    cookie or a CSRF header changes the request S3 signed for and produces
//    the same opaque 403.
// 5. A 200 response with an empty body. Calling response.json() here would
//    throw a SyntaxError and mask a real success as a failure.
//
// Never fold this into client.js's request().

import { ApiError } from './client'

/**
 * PUTs file's raw bytes to a presigned S3 URL. Resolves with nothing on
 * success. Throws ApiError(status, text) on any non-2xx — S3's error body
 * is XML, read verbatim with response.text() and never parsed, the same
 * "render it verbatim, the ugliness is upstream" precedent client.js uses
 * for Spring Boot's raw /error body.
 */
export async function putPresignedFile(uploadUrl, file, { signal } = {}) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    credentials: 'omit',
    headers: { 'Content-Type': 'image/jpeg' },
    body: file,
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new ApiError(response.status, text || `Request failed with status ${response.status}`)
  }
}
