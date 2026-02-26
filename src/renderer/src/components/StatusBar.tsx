import type { BufferState } from '../../../shared/ipc'

interface StatusBarProps {
  bufferState: BufferState | null
  historyLength?: number
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function SaveStatus({ bufferState }: { bufferState: BufferState | null }): React.JSX.Element {
  if (!bufferState) {
    return <span className="text-text-subtle">No buffer</span>
  }

  if (bufferState.dirty) {
    return <span className="text-warning">Unsaved changes</span>
  }

  return (
    <span className="text-success">
      Saved{bufferState.lastSavedAt ? ` at ${formatTimestamp(bufferState.lastSavedAt)}` : ''}
    </span>
  )
}

export function StatusBar({ bufferState, historyLength }: StatusBarProps): React.JSX.Element {
  const modeTag = bufferState ? (bufferState.mode === 'draft' ? ' (draft)' : ' (live)') : ''
  const chapterLabel = bufferState ? `${bufferState.section}/${bufferState.slug}${modeTag}` : '--'
  const wordCount = bufferState?.wordCount ?? 0

  return (
    <div className="flex items-center justify-between px-4 h-7 bg-bg-surface border-t border-border text-xs shrink-0 select-none">
      {/* Chapter name */}
      <div className="text-text-muted truncate max-w-[200px]">{chapterLabel}</div>

      {/* Version info */}
      <div className="flex items-center gap-3">
        {historyLength != null && historyLength > 0 && (
          <span className="text-text-subtle">
            v{historyLength}
            {bufferState?.headHash ? ` (${bufferState.headHash.slice(0, 7)})` : ''}
          </span>
        )}
        {/* Word count */}
        <span className="text-text-subtle">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      {/* Save status */}
      <div>
        <SaveStatus bufferState={bufferState} />
      </div>
    </div>
  )
}
