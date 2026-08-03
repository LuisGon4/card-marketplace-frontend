import { useId, useState } from 'react'
import PrimaryButton from './PrimaryButton'
import { composerHint } from '../helpers/messaging/copy'

// connected drives the disabled state, not an editable/read-only split: the
// textarea itself always stays editable (see below) even while the socket
// is down, so only the button below reads `connected`.
function MessageComposer({ connected, onSend }) {
  const [draft, setDraft] = useState('')
  const hintId = useId()

  // Computed once and used by both the submit handler and the disabled
  // attribute: two separate copies of this condition could disagree and
  // let a blank frame reach the broker.
  const canSend = connected && draft.trim() !== ''

  function submit() {
    if (!canSend) return
    // No optimistic clear: only clear the draft once a frame is actually
    // published, so a click while disconnected leaves the draft intact
    // instead of eating it.
    if (onSend(draft)) {
      setDraft('')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    submit()
  }

  // A <textarea> does not submit its form on Enter — without this handler
  // Enter would silently do nothing here, which reads as broken rather than
  // as "use Shift+Enter." Shift+Enter is left alone so the browser inserts
  // its own newline.
  function handleKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return
    // An IME (Japanese/Chinese/Korean) also uses Enter to commit a composed
    // candidate. Without this guard that commit keydown is indistinguishable
    // from "submit," so it would fire mid-composition and publish whatever
    // partial draft happened to be sitting there. keyCode 229 is the
    // fallback for browsers that don't set isComposing on the commit keydown.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    event.preventDefault()
    submit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="message-draft" className="text-sm text-zinc-700">
          Message
        </label>
        <textarea
          id="message-draft"
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-describedby={hintId}
          // Deliberately not disabled while disconnected (lock #19):
          // disabling a focused field drops its focus, so a reconnect blip
          // would eat a half-typed message. Only Send below is disabled —
          // that alone keeps a blank or unsendable frame off the wire.
          className="w-full resize-none rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
        <p id={hintId} className="text-xs text-zinc-500">
          {composerHint}
        </p>
      </div>
      <PrimaryButton type="submit" disabled={!canSend}>
        Send
      </PrimaryButton>
    </form>
  )
}

export default MessageComposer
