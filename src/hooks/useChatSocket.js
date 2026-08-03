import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { API_BASE_URL } from '../api/client'
import { socketUrl, topicFor } from '../helpers/messaging/socket'

// One STOMP Client per (conversationId, mount), built fresh inside the
// effect below. Never a module singleton, never a ref carried across ids or
// across remounts: under StrictMode's double-mount, two Client instances
// briefly coexist because activate() only waits out a DEACTIVATING client
// *within the same instance* — it has no way to know about a sibling. The
// broker can therefore deliver one frame twice; that overlap is made
// harmless by the id-based dedupe in mergeById (messages.js), which is the
// intended fix — do not "solve" the overlap by caching the client instead.
export function useChatSocket(conversationId, { enabled, onMessage }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [connectionEpoch, setConnectionEpoch] = useState(0)

  // A ref, not a dependency: the page re-renders on every message and would
  // otherwise hand the effect below a new function identity each time,
  // tearing down and rebuilding the socket for no reason. Kept current by
  // its own effect rather than assigned during render — react-hooks/refs
  // forbids touching a ref's `current` while rendering.
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  // This effect's job is exactly the pattern react-hooks/set-state-in-effect
  // exists to steer people away from *by default* — but the exception it
  // documents is this hook's job description: "subscribe to an external
  // system, call setState in a callback when it changes." A STOMP
  // connection's status has no other source of truth. Same precedent as
  // useFetch.js's disable, for the same reason.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      setError(null)
      return
    }

    // Sole guard against a client writing state after its own effect
    // cleanup ran. Under StrictMode the first mount's onWebSocketClose fires
    // *after* cleanup, and without this it would overwrite the second
    // mount's live status with a stale "disconnected".
    let cancelled = false

    setStatus('connecting')
    setError(null)

    // All callbacks live in this constructor config, never assigned after
    // construction, so there is no window where the client has a handler
    // missing.
    const client = new Client({
      brokerURL: socketUrl(API_BASE_URL),
      reconnectDelay: 5000,
      connectionTimeout: 10000,
      onConnect: () => {
        if (cancelled) return
        setStatus('connected')
        setError(null)
        setConnectionEpoch((epoch) => epoch + 1)

        // Subscribing here, rather than right after activate(), is what
        // makes a reconnect re-subscribe for free — subscribing before the
        // STOMP handshake completes throws. The subscription object is
        // deliberately not kept: deactivate() tears the whole client down,
        // and holding it would only invite an unsubscribe() on a dead
        // socket.
        client.subscribe(topicFor(conversationId), (frame) => {
          if (cancelled) return
          onMessageRef.current(JSON.parse(frame.body))
        })
      },
      onWebSocketClose: () => {
        if (cancelled) return
        setStatus('disconnected')
      },
      onStompError: (frame) => {
        if (cancelled) return
        setStatus('disconnected')
        setError(frame.headers?.message ?? 'The chat server rejected the connection.')
      },
      onWebSocketError: () => {
        if (cancelled) return
        setStatus('disconnected')
        setError('Could not reach the chat server.')
      },
    })

    client.activate()

    return () => {
      cancelled = true
      // deactivate() returns a Promise that resolves once the socket has
      // fully closed. A useEffect cleanup can't be async, and it doesn't
      // need to be: reconnect attempts stop at this call, not at the
      // promise's resolution, which is the only thing that matters here.
      client.deactivate()
    }
  }, [conversationId, enabled])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { status, error, connectionEpoch }
}
