import { useEffect, useState } from 'react'
import { apiGet } from '../api/client'

// Root auth probe (TODO(Luis) #3 and #8). There is no session-check
// endpoint (BACKEND.md "Discrepancies"), so this calls
// GET /api/listings/mine purely to learn *whether* someone is signed in.
// The response body is discarded on purpose — an authenticated user with
// zero listings returns `[]`, which still means signed in, and there is no
// username anywhere in this response to read (TODO(Luis) #3: no
// /api/users/me exists; do not scrape sellerUsername off a listing, that's
// the *seller's* name, not the caller's).
//
// Deliberately NOT built on useFetch: useFetch populates `error` on any
// non-2xx response, which would risk an error banner for a perfectly
// healthy anonymous visit. A 401 here is the expected, healthy anonymous
// path (TODO(Luis) #8) — every anonymous page load fires exactly one
// GET /api/listings/mine that comes back 401. That is not a bug; it's the
// documented probe. It must never be retried and never surfaced as an
// error.
//
// Status is three-valued, not a boolean, so the header can show a neutral
// placeholder while this is in flight instead of flashing "Sign in with
// Google" and then swapping to "Signed in".
export function useAuthStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const controller = new AbortController()

    apiGet('/api/listings/mine', { signal: controller.signal })
      .then(() => {
        if (controller.signal.aborted) return
        setStatus('signedIn')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // Any failure here — the expected 401, a network error, a 500, a
        // CORS failure — resolves to signedOut. Client-side gating is
        // cosmetic (the server is the real enforcement), and a genuine
        // backend outage surfaces through the browse page's own error
        // state instead. No retry, no error UI from this hook.
        setStatus('signedOut')
      })

    return () => controller.abort()
  }, [])

  return status
}
