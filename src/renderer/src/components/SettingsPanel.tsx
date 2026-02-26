import { useEffect, useState } from 'react'

interface SettingsPanelProps {
  onClose: () => void
}

interface TestResult {
  success: boolean
  message: string
  latencyMs?: number
}

export function SettingsPanel({ onClose }: SettingsPanelProps): React.JSX.Element {
  const [cosApiUrl, setCosApiUrl] = useState('')
  const [cosTenantId, setCosTenantId] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.cosEditor.getSettings().then((settings) => {
      setCosApiUrl(settings.cosApiUrl)
      setCosTenantId(settings.cosTenantId)
    })
  }, [])

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
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface rounded-lg border border-border shadow-xl w-[420px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-overlay text-text-muted hover:text-text transition-colors"
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
              className="w-full px-3 py-1.5 text-sm bg-bg rounded border border-border text-text placeholder-text-subtle focus:outline-none focus:border-accent"
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
              className="w-full px-3 py-1.5 text-sm bg-bg rounded border border-border text-text placeholder-text-subtle focus:outline-none focus:border-accent"
            />
          </div>

          {/* Test Connection */}
          <div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 text-sm bg-bg-overlay rounded hover:bg-border text-text transition-colors disabled:opacity-50"
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
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded hover:bg-bg-overlay text-text-muted transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-accent rounded hover:bg-accent-hover text-bg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
