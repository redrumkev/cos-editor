import { useCallback, useEffect, useState } from 'react'
import { ConnectionBanner } from './components/ConnectionBanner'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { EditorMount } from './editor/EditorMount'

interface BufferState {
  bookId: string
  section: string
  slug: string
  content: string
  dirty: boolean
  headHash: string | null
  lastSavedAt: string | null
  wordCount: number
}

interface CosStatus {
  connected: boolean
  apiUrl: string
  error?: string
}

function App(): React.JSX.Element {
  const [bufferState, setBufferState] = useState<BufferState | null>(null)
  const [cosStatus, setCosStatus] = useState<CosStatus>({ connected: false, apiUrl: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    window.cosEditor.onBufferState((state: BufferState) => setBufferState(state))
    window.cosEditor.onCosStatus((status: CosStatus) => setCosStatus(status))
  }, [])

  const handleEditorChange = useCallback((content: string) => {
    window.cosEditor.applyChanges({ content })
  }, [])

  return (
    <div className="flex flex-col h-full">
      <TopBar cosStatus={cosStatus} onSettingsClick={() => setSettingsOpen(true)} />
      {!cosStatus.connected && (
        <ConnectionBanner apiUrl={cosStatus.apiUrl} error={cosStatus.error} />
      )}
      <EditorMount content={bufferState?.content ?? ''} onChange={handleEditorChange} />
      <StatusBar bufferState={bufferState} />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
