import { useCallback, useEffect, useState } from 'react'
import type {
  BookRecord,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  SectionType,
} from '../../shared/cos-types'
import { ConnectionBanner } from './components/ConnectionBanner'
import { LeftPane } from './components/LeftPane'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { VersionViewer } from './components/VersionViewer'
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

type TabId = 'structure' | 'outline' | 'changes'

function App(): React.JSX.Element {
  const [bufferState, setBufferState] = useState<BufferState | null>(null)
  const [cosStatus, setCosStatus] = useState<CosStatus>({ connected: false, apiUrl: '' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null)
  const [manuscript, setManuscript] = useState<ManuscriptStructure | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('structure')
  const [historyEntries, setHistoryEntries] = useState<CasHistoryEntry[]>([])
  const [viewingVersion, setViewingVersion] = useState<{
    hash: string
    content: ChapterContent
    index: number
  } | null>(null)

  useEffect(() => {
    window.cosEditor.onBufferState((state: BufferState) => setBufferState(state))
    window.cosEditor.onCosStatus((status: CosStatus) => setCosStatus(status))
  }, [])

  const handleEditorChange = useCallback((content: string) => {
    window.cosEditor.applyChanges({ content })
  }, [])

  const handleSelectBook = useCallback((book: BookRecord) => {
    setSelectedBook(book)
    setHistoryEntries([])
    setViewingVersion(null)
    window.cosEditor.loadManuscript(book.id).then(setManuscript).catch(console.error)
  }, [])

  const handleSelectChapter = useCallback(
    (section: SectionType, slug: string) => {
      if (!selectedBook) return
      setViewingVersion(null)

      window.cosEditor.openBuffer({ bookId: selectedBook.id, section, slug }).catch(console.error)

      window.cosEditor
        .loadHistory({ bookId: selectedBook.id, section, slug })
        .then(setHistoryEntries)
        .catch(console.error)
    },
    [selectedBook],
  )

  const handleViewVersion = useCallback(
    (hash: string) => {
      if (!selectedBook || !bufferState) return
      const index = historyEntries.findIndex((e) => e.hash === hash)
      if (index === -1) return

      window.cosEditor
        .loadVersion({
          bookId: selectedBook.id,
          section: bufferState.section as SectionType,
          slug: bufferState.slug,
          hash,
        })
        .then((content) => {
          setViewingVersion({ hash, content, index })
        })
        .catch(console.error)
    },
    [selectedBook, bufferState, historyEntries],
  )

  const handleRestoreVersion = useCallback(
    (hash: string) => {
      if (!selectedBook || !bufferState) return
      const section = bufferState.section as SectionType
      const { slug } = bufferState

      window.cosEditor
        .restoreVersion({
          bookId: selectedBook.id,
          section,
          slug,
          targetHash: hash,
          expectedHead: bufferState.headHash,
        })
        .then(() => {
          setViewingVersion(null)
          // Re-open buffer and reload history
          window.cosEditor
            .openBuffer({ bookId: selectedBook.id, section, slug })
            .catch(console.error)
          window.cosEditor
            .loadHistory({ bookId: selectedBook.id, section, slug })
            .then(setHistoryEntries)
            .catch(console.error)
        })
        .catch(console.error)
    },
    [selectedBook, bufferState],
  )

  const handleCloseVersion = useCallback(() => {
    setViewingVersion(null)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <TopBar
        cosStatus={cosStatus}
        onSettingsClick={() => setSettingsOpen(true)}
        selectedBook={selectedBook}
        onSelectBook={handleSelectBook}
      />
      {!cosStatus.connected && (
        <ConnectionBanner apiUrl={cosStatus.apiUrl} error={cosStatus.error} />
      )}
      <div className="flex flex-1 min-h-0">
        <LeftPane
          manuscript={manuscript}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          bufferState={bufferState}
          historyEntries={historyEntries}
          onSelectChapter={handleSelectChapter}
          onViewVersion={handleViewVersion}
          activeVersionHash={viewingVersion?.hash ?? null}
        />
        <div className="flex-1 min-w-0">
          <EditorMount content={bufferState?.content ?? ''} onChange={handleEditorChange} />
        </div>
        {viewingVersion && (
          <VersionViewer
            version={viewingVersion}
            historyLength={historyEntries.length}
            onClose={handleCloseVersion}
            onRestore={handleRestoreVersion}
          />
        )}
      </div>
      <StatusBar bufferState={bufferState} historyLength={historyEntries.length} />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
