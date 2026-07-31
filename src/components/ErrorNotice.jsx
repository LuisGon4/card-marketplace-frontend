import SecondaryButton from './SecondaryButton'

function ErrorNotice({ message, onRetry }) {
  return (
    <div role="alert" className="space-y-3 border border-red-300 bg-red-50 p-4">
      {/* Server's plain-text message, rendered verbatim — never rewritten
          or paraphrased (CLAUDE.md "API access"). */}
      <p className="text-sm text-zinc-900">{message}</p>
      <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>
    </div>
  )
}

export default ErrorNotice
