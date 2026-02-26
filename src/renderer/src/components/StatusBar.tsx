interface BufferState {
  bookId: string
  section: string
  slug: string
  content: string
  dirty: boolean
  headHash: string | null
  lastSavedAt: string | null
  wordCount: number
}

interface StatusBarProps {
  bufferState: BufferState | null
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

export function StatusBar({ bufferState }: StatusBarProps): React.JSX.Element {
  const chapterLabel = bufferState ? `${bufferState.section}/${bufferState.slug}` : '--'
  const wordCount = bufferState?.wordCount ?? 0

  return (
    <div className="flex items-center justify-between px-4 h-7 bg-bg-surface border-t border-border text-xs shrink-0 select-none">
      {/* Chapter name */}
      <div className="text-text-muted truncate max-w-[200px]">{chapterLabel}</div>

      {/* Word count */}
      <div className="text-text-subtle">
        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
      </div>

      {/* Save status */}
      <div>
        <SaveStatus bufferState={bufferState} />
      </div>
    </div>
  )
}
