import { formatDateTime } from '../helpers/messaging/dates'
import { isOwnMessage } from '../helpers/messaging/messages'
import { messageAuthorLabel } from '../helpers/messaging/copy'

// The transcript. `<ol role="log">` must exist in the DOM before its
// content ever changes — MDN documents that a live region created and
// populated in the same tick may never be registered by assistive tech, so
// later appends go unannounced too. The page mounts this component
// unconditionally from its first render, with `messages` starting empty,
// rather than gating it behind a loaded/loading check. Do not "optimize"
// this into a conditional render.
//
// No auto-scroll to the latest message: that would fight a user who has
// scrolled up to read earlier messages.
function MessageList({ messages, currentUserId }) {
  return (
    <ol role="log" aria-label="Messages" className="space-y-3">
      {messages.map((message) => {
        const isOwn = isOwnMessage(message, currentUserId)
        return (
          <li
            key={message.id}
            // Attribution is two-signal (WCAG 1.4.1: not colour alone) — the
            // author label below plus this border. Both states use
            // border-l-2, only the colour differs, so switching author never
            // shifts layout — the same discipline as ImageGallery's
            // selected/unselected thumbnail border.
            className={`border-l-2 pl-3 ${isOwn ? 'border-blue-700' : 'border-zinc-200'}`}
          >
            <p className="text-sm text-zinc-600">
              {messageAuthorLabel(isOwn, message.senderUsername)}{' '}
              <time dateTime={message.sentAt}>{formatDateTime(message.sentAt)}</time>
            </p>
            {/* User-typed text: whitespace-pre-line keeps line breaks, and
                there is no clamp — collapsing either would lose information. */}
            <p className="whitespace-pre-line break-words text-sm text-zinc-900">
              {message.content}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

export default MessageList
