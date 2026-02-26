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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
      role="dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-[480px] max-h-[60vh] bg-bg-surface border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
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
            className="w-full bg-transparent text-text text-sm outline-none placeholder-text-subtle"
          />
        </div>
        <div className="overflow-y-auto">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm ${
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
