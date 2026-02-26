import type { BookRecord } from '../../../shared/cos-types'
import type { BufferMode } from '../../../shared/ipc'
import { BookSwitcher } from './BookSwitcher'

interface TopBarProps {
  cosStatus: { connected: boolean }
  onSettingsClick: () => void
  selectedBook: BookRecord | null
  onSelectBook: (book: BookRecord) => void
  bufferMode: BufferMode
  onBufferModeChange: (mode: BufferMode) => void
  canAcceptDraft: boolean
  onAcceptDraft: () => void
  captureOpen: boolean
  onToggleCapture: () => void
}

export function TopBar({
  cosStatus,
  onSettingsClick,
  selectedBook,
  onSelectBook,
  bufferMode,
  onBufferModeChange,
  canAcceptDraft,
  onAcceptDraft,
  captureOpen,
  onToggleCapture,
}: TopBarProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 h-10 bg-bg-surface border-b border-border shrink-0 select-none">
      <BookSwitcher
        selectedBook={selectedBook}
        onSelectBook={onSelectBook}
        connected={cosStatus.connected}
      />
      <div className="flex items-center gap-3">
        {/* Live / Draft toggle */}
        <div className="flex items-center rounded border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => onBufferModeChange('live')}
            className={`px-2.5 py-1 transition-colors ${
              bufferMode === 'live'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-muted hover:bg-bg-overlay'
            }`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => onBufferModeChange('draft')}
            className={`px-2.5 py-1 transition-colors ${
              bufferMode === 'draft'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-muted hover:bg-bg-overlay'
            }`}
          >
            Draft
          </button>
        </div>
        {/* Accept Draft button */}
        <button
          type="button"
          onClick={onAcceptDraft}
          disabled={!canAcceptDraft}
          className="px-2.5 py-1 text-xs rounded border border-border text-success hover:bg-success/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Accept Draft
        </button>
        {/* Capture toggle */}
        <button
          type="button"
          onClick={onToggleCapture}
          className={`px-2.5 py-1 text-xs rounded border transition-colors ${
            captureOpen
              ? 'bg-accent/20 text-accent border-accent/40 font-medium'
              : 'border-border text-text-muted hover:bg-bg-overlay'
          }`}
          title="Toggle capture panel"
        >
          Capture
        </button>
        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${cosStatus.connected ? 'bg-success' : 'bg-error'}`}
          />
          <span className="text-xs text-text-subtle">
            {cosStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {/* Settings button */}
        <button
          type="button"
          onClick={onSettingsClick}
          className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-text transition-colors"
          aria-label="Settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
            role="img"
            aria-label="Settings"
          >
            <title>Settings</title>
            <path
              fillRule="evenodd"
              d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.36a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 11.36V10a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.71l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
