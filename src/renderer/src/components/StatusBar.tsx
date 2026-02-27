import { useEffect, useRef, useState } from 'react'
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
  const dirtyStartRef = useRef<number | null>(null)
  const clearStateTimerRef = useRef<number | null>(null)
  const pendingSavedTimerRef = useRef<number | null>(null)
  const [statusPhase, setStatusPhase] = useState<'normal' | 'saving' | 'saved'>('normal')

  useEffect(() => {
    return () => {
      if (clearStateTimerRef.current != null) {
        window.clearTimeout(clearStateTimerRef.current)
      }
      if (pendingSavedTimerRef.current != null) {
        window.clearTimeout(pendingSavedTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!bufferState) {
      dirtyStartRef.current = null
      setStatusPhase('normal')
      return
    }

    if (bufferState.dirty) {
      if (dirtyStartRef.current == null) {
        dirtyStartRef.current = Date.now()
      }
      if (clearStateTimerRef.current != null) {
        window.clearTimeout(clearStateTimerRef.current)
      }
      if (pendingSavedTimerRef.current != null) {
        window.clearTimeout(pendingSavedTimerRef.current)
      }
      setStatusPhase('saving')
      return
    }

    if (dirtyStartRef.current != null) {
      const elapsed = Date.now() - dirtyStartRef.current
      const delay = Math.max(500 - elapsed, 0)
      dirtyStartRef.current = null

      if (pendingSavedTimerRef.current != null) {
        window.clearTimeout(pendingSavedTimerRef.current)
      }
      pendingSavedTimerRef.current = window.setTimeout(() => {
        setStatusPhase('saved')
        clearStateTimerRef.current = window.setTimeout(() => {
          setStatusPhase('normal')
        }, 1200)
      }, delay)
    }
  }, [bufferState?.dirty, bufferState?.lastSavedAt, bufferState])

  if (!bufferState) {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-subtle transition-colors duration-[--duration-normal]">
        No buffer
      </span>
    )
  }

  if (statusPhase === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning transition-colors duration-[--duration-normal]">
        <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" aria-hidden="true" />
        Saving...
      </span>
    )
  }

  if (statusPhase === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-success transition-[color,opacity] duration-[--duration-normal] opacity-100">
        <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
        Saved
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-text-subtle transition-colors duration-[--duration-normal]">
      <span className="h-1.5 w-1.5 rounded-full bg-text-subtle" aria-hidden="true" />
      Synced{bufferState.lastSavedAt ? ` at ${formatTimestamp(bufferState.lastSavedAt)}` : ''}
    </span>
  )
}

export function StatusBar({ bufferState, historyLength }: StatusBarProps): React.JSX.Element {
  const modeTag = bufferState ? (bufferState.mode === 'draft' ? ' (draft)' : ' (live)') : ''
  const chapterLabel = bufferState ? `${bufferState.section}/${bufferState.slug}${modeTag}` : '--'
  const wordCount = bufferState?.wordCount ?? 0

  return (
    <div className="flex items-center px-4 h-7 bg-bg-surface border-t border-border text-xs shrink-0 select-none">
      {/* Chapter name */}
      <div className="min-w-0 flex-1 text-text-muted truncate max-w-[200px] transition-colors duration-[--duration-normal]">
        {chapterLabel}
      </div>

      {/* Version info */}
      <div className="min-w-0 flex-1 flex items-center justify-center gap-2.5 truncate">
        {historyLength != null && historyLength > 0 && (
          <span className="text-text-subtle truncate transition-colors duration-[--duration-normal]">
            v{historyLength}
            {bufferState?.headHash ? ` (${bufferState.headHash.slice(0, 7)})` : ''}
          </span>
        )}
        {/* Word count */}
        <span className="text-text-subtle truncate transition-colors duration-[--duration-normal]">
          {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
        </span>
      </div>

      {/* Save status */}
      <div className="min-w-0 flex-1 text-right truncate">
        <SaveStatus bufferState={bufferState} />
      </div>
    </div>
  )
}
