import { useEffect, useState } from 'react'
import { apiGet } from '../api/client'

// Root auth probe (TODO(Luis) #8). Calls GET /api/users/me to learn both
// *whether* someone is signed in and who they are.
//
// Deliberately NOT built on useFetch: useFetch populates `error` on any
// non-2xx response, which would risk an error banner for a perfectly
// healthy anonymous visit. A 401 here is the expected, healthy anonymous
// path (TODO(Luis) #8) — every anonymous page load fires exactly one
// GET /api/users/me that comes back 401. That is not a bug; it's the
// documented probe. It must never be retried and never surfaced as an
// error.
//
// Status is three-valued, not a boolean, so the header can show a neutral
// placeholder while this is in flight instead of flashing "Sign in with
// Google" and then swapping to "Signed in". `user` is null unless
// status === 'signedIn'.
export function useAuthStatus() {
  const [status, setStatus] = useState('checking')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    apiGet('/api/users/me', { signal: controller.signal })
      .then((body) => {
        if (controller.signal.aborted) return
        setUser(body)
        setStatus('signedIn')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // Any failure here — the expected 401, a network error, a 500, a
        // CORS failure — resolves to signedOut. Client-side gating is
        // cosmetic (the server is the real enforcement), and a genuine
        // backend outage surfaces through the browse page's own error
        // state instead. No retry, no error UI from this hook.
        setUser(null)
        setStatus('signedOut')
      })

    return () => controller.abort()
  }, [])

  return { status, user }
}
