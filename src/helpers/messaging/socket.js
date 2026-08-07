// The only place the /ws, /topic/… and /app/… strings exist (BACKEND.md
// "WebSocket (STOMP)"). Pure — no fetch, no module-load side effects — so it
// takes the API base URL as an argument rather than importing client.js,
// which throws at import time when the env var is missing.

// One substitution covers both http -> ws and https -> wss.
export function socketUrl(apiBaseUrl) {
  return `${apiBaseUrl.replace(/^http/, 'ws')}/ws`
}

// Ends at the id — no slash after it. The historic backend bug was a
// missing separator between "conversation" and the id
// (/topic/conversation{id}), not a missing trailing slash; adding one back
// here subscribes fine and silently receives nothing (BACKEND.md
// "Discrepancies").
export function topicFor(conversationId) {
  return `/topic/conversation/${conversationId}`
}

// Same vocabulary as the two destinations above. Also ends at the id, same
// reasoning as topicFor.
export function sendDestinationFor(conversationId) {
  return `/app/chat/${conversationId}`
}
