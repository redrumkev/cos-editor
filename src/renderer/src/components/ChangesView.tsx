import type { CasHistoryEntry } from '../../../shared/cos-types'

interface ChangesViewProps {
  entries: CasHistoryEntry[]
  activeHash: string | null
  onViewVersion: (hash: string) => void
}

function timeAgo(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diff = now - then

  if (Number.isNaN(diff) || diff < 0) return dateString

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function ChangesView({
  entries,
  activeHash,
  onViewVersion,
}: ChangesViewProps): React.JSX.Element {
  if (entries.length === 0) {
    return <div className="px-3 py-4 text-sm text-text-subtle">No history</div>
  }

  return (
    <div className="py-1 overflow-y-auto flex-1 scrollbar-thin">
      {entries.map((entry, index) => {
        const versionLabel = `v${entries.length - index}`
        const shortHash = entry.hash.slice(0, 7)
        const isActive = entry.hash === activeHash

        return (
          <button
            key={entry.hash}
            type="button"
            onClick={() => onViewVersion(entry.hash)}
            className={`w-full text-left px-3 py-2 transition-colors duration-[--duration-normal] ${
              isActive
                ? 'bg-bg-hover text-accent'
                : 'text-text-muted hover:bg-bg-overlay hover:text-text'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{versionLabel}</span>
              <span className="text-xs text-text-subtle font-mono">{shortHash}</span>
            </div>
            <div className="text-xs text-text-subtle mt-0.5">{timeAgo(entry.created_at)}</div>
          </button>
        )
      })}
    </div>
  )
}
