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
  const title = conflict.operation === 'accept' ? 'Accept Conflict' : 'Save Conflict'
  const modeLabel = conflict.mode === 'draft' ? 'Draft' : 'Live'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface border border-border rounded-lg shadow-lg w-[420px] p-5">
        <h2 className="text-base font-semibold text-text mb-2">{title}</h2>
        <p className="text-sm text-text-muted mb-1">
          Mode: <span className="text-text">{modeLabel}</span>
        </p>
        <p className="text-sm text-text-muted mb-4">{conflict.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded border border-border text-text-muted hover:bg-bg-overlay transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReload}
            className="px-3 py-1.5 text-sm rounded border border-border text-text hover:bg-bg-overlay transition-colors"
          >
            Reload Server
          </button>
          <button
            type="button"
            onClick={onOverwrite}
            className="px-3 py-1.5 text-sm rounded bg-warning/20 border border-warning/40 text-warning hover:bg-warning/30 transition-colors"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  )
}
