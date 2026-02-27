import { useCallback, useState } from 'react'
import type { CaptureResult, CaptureState } from '../../../shared/cos-types'

interface CapturePanelProps {
  captureState: CaptureState
  onCreateCapture: (content: string) => void
  onApplyResult: (resultContent: string) => void
  onClose: () => void
}

export function CapturePanel({
  captureState,
  onCreateCapture,
  onApplyResult,
  onClose,
}: CapturePanelProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(() => {
    if (!input.trim() || submitting) return
    setSubmitting(true)
    onCreateCapture(input.trim())
    setInput('')
    setSubmitting(false)
  }, [input, submitting, onCreateCapture])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const snapshot = captureState.activeSnapshot
  const todo = snapshot?.todo
  const results = snapshot?.results ?? []
  const isPolling = todo && !['ready_for_review', 'done', 'closed'].includes(todo.status)
  const iconButtonClass =
    'rounded-md p-1.5 text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const inputClass =
    'flex-1 rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-sm text-text placeholder-text-subtle transition-colors duration-[--duration-normal] focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const secondaryButtonClass =
    'rounded-md px-2 py-1.5 text-sm text-text bg-bg-overlay transition-colors duration-[--duration-normal] hover:bg-border disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const primaryButtonClass =
    'w-full rounded-md bg-accent py-1.5 text-sm font-medium text-bg transition-colors duration-[--duration-normal] hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

  return (
    <div className="w-80 border-l border-border flex flex-col bg-bg-surface shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs font-medium text-text-subtle uppercase tracking-wider">
          Capture
        </span>
        <button
          type="button"
          onClick={onClose}
          className={iconButtonClass}
          aria-label="Close capture panel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <title>Close</title>
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Input */}
      <div className="p-3 border-b border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask agent to..."
            disabled={submitting}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || submitting}
            className={secondaryButtonClass}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <title>Submit</title>
              <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-3">
        {!snapshot && !isPolling && (
          <p className="text-xs text-text-subtle text-center mt-8">
            Ask the agent to help with your writing.
          </p>
        )}

        {todo && (
          <div className="space-y-3">
            {/* Todo card */}
            <div className="bg-bg-overlay rounded-md p-3 border border-border shadow-sm">
              <p className="text-sm text-text mb-2">{todo.content}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isPolling
                      ? 'bg-warning animate-pulse'
                      : todo.status === 'ready_for_review'
                        ? 'bg-success'
                        : 'bg-text-subtle'
                  }`}
                />
                <span className="text-xs text-text-muted">
                  {isPolling
                    ? 'Processing...'
                    : todo.status === 'ready_for_review'
                      ? 'Ready'
                      : todo.status}
                </span>
              </div>
            </div>

            {/* Results */}
            {results.map((result: CaptureResult) => (
              <div key={result.id} className="bg-bg-overlay rounded-md p-3 border border-accent/30">
                <p className="text-sm text-text whitespace-pre-wrap mb-3">
                  {result.result.content}
                </p>
                {result.status === 'staging' && (
                  <button
                    type="button"
                    onClick={() => onApplyResult(result.result.content)}
                    className={primaryButtonClass}
                  >
                    Apply to Draft
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
