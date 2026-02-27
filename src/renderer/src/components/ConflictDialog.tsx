import { useEffect, useRef, useState } from 'react'
import type { BufferConflict } from '../../../shared/ipc'

interface ConflictDialogProps {
  conflict: BufferConflict
  onCancel: () => void
  onReload: () => void
  onOverwrite: () => void
}

export function ConflictDialog({
  conflict,
  onCancel,
  onReload,
  onOverwrite,
}: ConflictDialogProps): React.JSX.Element {
  const closeAnimationMs = 250
  const title = conflict.operation === 'accept' ? 'Accept Conflict' : 'Save Conflict'
  const modeLabel = conflict.mode === 'draft' ? 'Draft' : 'Live'
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const buttonBaseClass =
    'px-3 py-1.5 text-sm rounded-md border transition-colors duration-[--duration-normal] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || focusable.length === 0) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    panel.addEventListener('keydown', handleKeyDown)
    return () => panel.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(
    () => () => {
      if (closeTimeoutRef.current != null) {
        window.clearTimeout(closeTimeoutRef.current)
      }
    },
    [],
  )

  function requestCancel() {
    if (isClosing) return
    setIsClosing(true)
    closeTimeoutRef.current = window.setTimeout(() => {
      onCancel()
    }, closeAnimationMs)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm transition-opacity duration-[--duration-slow] [transition-timing-function:var(--ease-out)] ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestCancel()
      }}
    >
      <div
        ref={panelRef}
        className={`w-[420px] max-w-[90vw] rounded-xl border border-border bg-bg-surface p-5 shadow-xl transition-[opacity,transform] duration-[--duration-slow] [transition-timing-function:var(--ease-out)] ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <h2 className="text-base font-semibold text-text mb-2">{title}</h2>
        <p className="text-sm text-text-muted mb-1">
          Mode: <span className="text-text">{modeLabel}</span>
        </p>
        <p className="text-sm text-text-muted mb-4">{conflict.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={requestCancel}
            className={`${buttonBaseClass} border-border text-text-muted hover:bg-bg-overlay hover:text-text`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReload}
            className={`${buttonBaseClass} border-border text-text hover:bg-bg-overlay`}
          >
            Reload Server
          </button>
          <button
            type="button"
            onClick={onOverwrite}
            className={`${buttonBaseClass} border-warning/40 bg-warning/20 text-warning hover:bg-warning/30`}
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  )
}
