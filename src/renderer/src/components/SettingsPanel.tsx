import { useEffect, useRef, useState } from 'react'

interface SettingsPanelProps {
  onClose: () => void
}

interface TestResult {
  success: boolean
  message: string
  latencyMs?: number
}

export function SettingsPanel({ onClose }: SettingsPanelProps): React.JSX.Element {
  const closeAnimationMs = 250
  const [cosApiUrl, setCosApiUrl] = useState('')
  const [cosTenantId, setCosTenantId] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    window.cosEditor.getSettings().then((settings) => {
      setCosApiUrl(settings.cosApiUrl)
      setCosTenantId(settings.cosTenantId)
    })
  }, [])

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

  function requestClose() {
    if (isClosing) return
    setIsClosing(true)
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose()
    }, closeAnimationMs)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.cosEditor.testConnection()
      setTestResult(result)
    } catch {
      setTestResult({ success: false, message: 'Test failed unexpectedly' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await window.cosEditor.setSettings({ cosApiUrl, cosTenantId })
      requestClose()
    } finally {
      setSaving(false)
    }
  }

  const iconButtonClass =
    'p-1.5 rounded-md text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const inputClass =
    'w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text placeholder-text-subtle transition-colors duration-[--duration-normal] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus:border-accent'
  const secondaryButtonClass =
    'px-3 py-1.5 text-sm rounded-md border border-border bg-bg-overlay text-text transition-colors duration-[--duration-normal] hover:bg-border disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const ghostButtonClass =
    'px-3 py-1.5 text-sm rounded-md text-text-muted transition-colors duration-[--duration-normal] hover:bg-bg-overlay hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
  const primaryButtonClass =
    'px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-bg transition-colors duration-[--duration-normal] hover:bg-accent-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur-sm transition-opacity duration-[--duration-slow] [transition-timing-function:var(--ease-out)] ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <div
        ref={panelRef}
        className={`w-[420px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-bg-surface shadow-xl transition-[opacity,transform] duration-[--duration-slow] [transition-timing-function:var(--ease-out)] ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Settings</h2>
          <button
            type="button"
            onClick={requestClose}
            className={iconButtonClass}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              role="img"
              aria-label="Close"
            >
              <title>Close</title>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* COS URL */}
          <div>
            <label htmlFor="cos-url" className="block text-xs text-text-muted mb-1">
              COS API URL
            </label>
            <input
              id="cos-url"
              type="text"
              value={cosApiUrl}
              onChange={(e) => setCosApiUrl(e.target.value)}
              placeholder="http://localhost:8484"
              className={inputClass}
            />
          </div>

          {/* Tenant ID */}
          <div>
            <label htmlFor="tenant-id" className="block text-xs text-text-muted mb-1">
              Tenant ID
            </label>
            <input
              id="tenant-id"
              type="text"
              value={cosTenantId}
              onChange={(e) => setCosTenantId(e.target.value)}
              placeholder="default"
              className={inputClass}
            />
          </div>

          {/* Test Connection */}
          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className={secondaryButtonClass}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <p className={`mt-2 text-xs ${testResult.success ? 'text-success' : 'text-error'}`}>
                {testResult.message}
                {testResult.latencyMs != null && ` (${testResult.latencyMs}ms)`}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button type="button" onClick={requestClose} className={ghostButtonClass}>
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={primaryButtonClass}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
