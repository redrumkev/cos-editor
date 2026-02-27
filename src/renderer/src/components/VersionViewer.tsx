import { useCallback, useState } from 'react'
import type { ChapterContent } from '../../../shared/cos-types'

interface VersionViewerProps {
  version: { hash: string; content: ChapterContent; index: number }
  historyLength: number
  onClose: () => void
  onRestore: (hash: string) => void
}

export function VersionViewer({
  version,
  historyLength,
  onClose,
  onRestore,
}: VersionViewerProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const content = version.content.content_draft || version.content.content_published || ''
  const versionLabel = `Version ${historyLength - version.index}`

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(console.error)
  }, [content])

  const handleRestore = useCallback(() => {
    onRestore(version.hash)
  }, [onRestore, version.hash])

  const iconButtonClass =
    'rounded-md p-1.5 text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const primaryButtonClass =
    'rounded-md bg-accent px-3 py-1 text-sm font-medium text-bg transition-colors duration-[--duration-normal] hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const secondaryButtonClass =
    'rounded-md border border-border px-3 py-1 text-sm text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

  return (
    <div className="w-[400px] border-l border-border bg-bg-surface flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{versionLabel}</span>
          <span className="text-xs font-mono text-text-subtle">{version.hash.slice(0, 7)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={iconButtonClass}
          aria-label="Close version viewer"
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        <pre className="whitespace-pre-wrap font-mono text-sm text-text">{content}</pre>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border shrink-0">
        <button type="button" onClick={handleRestore} className={primaryButtonClass}>
          Restore
        </button>
        <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
