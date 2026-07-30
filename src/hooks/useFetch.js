import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../api/client'

// The single read pattern for the whole app (CLAUDE.md "Data fetching").
// `path` is a single string with the query string already included, or
// `null` to skip fetching. A single primitive argument (rather than an
// options object) lets the effect depend on [path] without
// useMemo/useCallback gymnastics.

/**
 * Error-shape decision: `error` is stored exactly as thrown, not wrapped or
 * normalized into a new shape.
 *
 * `client.js` throws `ApiError` on a non-2xx response — it has `.status`
 * and a `.message` that is always non-empty (client.js falls back to a
 * status-code message when the server sends an empty body). If `fetch`
 * itself rejects instead (offline, DNS failure, backend down, blocked by
 * CORS), that's a raw `TypeError` with no `.status` and a browser-supplied
 * message like "Failed to fetch" — terse, but still a non-empty string a
 * human can read.
 *
 * Every consumer of this hook only needs `error.message` to satisfy
 * CLAUDE.md's "render the plain-text message" rule, and both shapes already
 * guarantee that. So there is nothing to fix here: introducing a wrapper
 * object (e.g. `{ message, status }`) would be a new type for every screen
 * to learn, in exchange for a property (`status`) that no consumer reads.
 * `error.status` stays `undefined` for network failures and a real number
 * for API errors — accurate, and available later if a screen ever needs to
 * branch on it (e.g. a 404 vs. a 500), without this hook having erased it.
 * This is why no screen has to special-case two shapes: they only ever
 * touch `.message`, which is uniform across both.
 *
 * This normalization intentionally lives here, not in `client.js`:
 * `client.js`'s job is talking HTTP and throwing `ApiError` for a real
 * HTTP failure. A rejected `fetch` promise isn't an HTTP response at all,
 * so wrapping it into a fake `ApiError` there would be inventing status
 * information client.js doesn't have. Leaving it as a `TypeError` is
 * honest about what actually happened.
 */
export function useFetch(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState(null)
  const [refetchCount, setRefetchCount] = useState(0)

  // eslint-plugin-react-hooks' set-state-in-effect rule flags synchronous
  // setState inside an effect, favoring Suspense/`use()` patterns. CLAUDE.md
  // mandates the classic { data, loading, error } fetch-effect hook instead
  // (no data-fetching library, no Suspense), and marking a new request as
  // loading is that pattern's required first step, not an accidental cascade.
  // Scoped to this effect rather than disabled project-wide; Luis owns whether
  // the rule itself should be reconfigured.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Clear rather than bail: going from a real path back to `null` must not
    // leave the previous request's data on screen.
    if (path === null) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()

    setLoading(true)
    setError(null)
    setData(null)

    apiGet(path, { signal: controller.signal })
      .then((json) => {
        setData(json)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        // The signal is authoritative: if this effect run was aborted, a
        // stale response must never write state, no matter how the error
        // is shaped (real fetch aborts throw a DOMException named
        // "AbortError", but checking the signal directly doesn't depend on
        // guessing that shape).
        if (controller.signal.aborted) return

        setData(null)
        setError(err)
        setLoading(false)
      })

    return () => controller.abort()
  }, [path, refetchCount])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Memoized so its identity is stable: this hook is used app-wide, and an
  // unstable refetch would break memoized children or loop if listed in a
  // dependency array.
  const refetch = useCallback(() => {
    setRefetchCount((count) => count + 1)
  }, [])

  return { data, loading, error, refetch }
}
