import { useEffect, useMemo, useRef, useState } from 'react'

interface Command {
  id: string
  title: string
  shortcut?: string
  action: () => void
  enabled?: boolean
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  onForceSave: () => void
  onToggleMode: () => void
  onToggleLeftPane: () => void
  onToggleCapturePane: () => void
  onOpenSettings: () => void
  canAcceptDraft: boolean
  onAcceptDraft: () => void
}

export function CommandPalette({
  open,
  onClose,
  onSave,
  onForceSave,
  onToggleMode,
  onToggleLeftPane,
  onToggleCapturePane,
  onOpenSettings,
  canAcceptDraft,
  onAcceptDraft,
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const commands: Command[] = useMemo(
    () => [
      { id: 'save', title: 'Save', shortcut: '\u2318S', action: onSave },
      { id: 'force-save', title: 'Force Save', shortcut: '\u2318\u21e7S', action: onForceSave },
      {
        id: 'toggle-mode',
        title: 'Toggle Live/Draft Mode',
        shortcut: '\u2318D',
        action: onToggleMode,
      },
      {
        id: 'accept-draft',
        title: 'Accept Draft',
        action: onAcceptDraft,
        enabled: canAcceptDraft,
      },
      {
        id: 'toggle-left-pane',
        title: 'Toggle Left Pane',
        shortcut: '\u2318B',
        action: onToggleLeftPane,
      },
      {
        id: 'toggle-capture',
        title: 'Toggle Capture Panel',
        shortcut: '\u2318\u21e7B',
        action: onToggleCapturePane,
      },
      { id: 'settings', title: 'Open Settings', shortcut: '\u2318,', action: onOpenSettings },
    ],
    [
      onSave,
      onForceSave,
      onToggleMode,
      onAcceptDraft,
      canAcceptDraft,
      onToggleLeftPane,
      onToggleCapturePane,
      onOpenSettings,
    ],
  )

  const filtered = useMemo(() => {
    if (!query) return commands.filter((c) => c.enabled !== false)
    const lower = query.toLowerCase()
    return commands.filter((c) => c.enabled !== false && c.title.toLowerCase().includes(lower))
  }, [query, commands])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    function handleKeyDown(event: KeyboardEvent) {
      const currentPanel = panelRef.current
      if (!currentPanel) return
      if (event.key !== 'Tab') return
      const focusable = currentPanel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
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
  }, [open])

  if (!open) return null

  function execute(cmd: Command) {
    onClose()
    cmd.action()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      execute(filtered[selectedIndex])
    }
  }

  const optionBaseClass =
    'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors duration-[--duration-normal] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 px-4 pb-4 pt-[20vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="flex max-h-[60vh] w-[480px] flex-col overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl"
      >
        <div className="p-3 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-text placeholder-text-subtle transition-colors duration-[--duration-normal] focus:outline-none focus-visible:border-border focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          />
        </div>
        <div className="overflow-y-auto p-2">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`cursor-pointer ${optionBaseClass} ${
                i === selectedIndex
                  ? 'bg-accent/20 text-text'
                  : 'text-text-muted hover:bg-bg-overlay'
              }`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => execute(cmd)}
              onKeyDown={() => {}}
              role="option"
              tabIndex={-1}
              aria-selected={i === selectedIndex}
            >
              <span>{cmd.title}</span>
              {cmd.shortcut && (
                <span className="text-xs text-text-subtle ml-4">{cmd.shortcut}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-sm text-text-subtle text-center">
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
