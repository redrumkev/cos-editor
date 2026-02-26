import { useCallback, useEffect, useState } from 'react'
import type {
  BookRecord,
  CaptureState,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  SectionType,
} from '../../shared/cos-types'
import type { BufferConflict, BufferMode, BufferState, CosStatus } from '../../shared/ipc'
import { CapturePanel } from './components/CapturePanel'
import { ConflictDialog } from './components/ConflictDialog'
import { ConnectionBanner } from './components/ConnectionBanner'
import { LeftPane } from './components/LeftPane'
import { SettingsPanel } from './components/SettingsPanel'
import { StatusBar } from './components/StatusBar'
import { TopBar } from './components/TopBar'
import { VersionViewer } from './components/VersionViewer'
import { EditorMount } from './editor/EditorMount'

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
  const [bufferMode, setBufferMode] = useState<BufferMode>('live')
  const [conflict, setConflict] = useState<BufferConflict | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureState, setCaptureState] = useState<CaptureState>({ todos: [] })

  useEffect(() => {
    window.cosEditor.onBufferState((state: BufferState) => setBufferState(state))
    window.cosEditor.onCosStatus((status: CosStatus) => setCosStatus(status))
    window.cosEditor.onBufferConflict((c: BufferConflict) => setConflict(c))
    window.cosEditor.onCaptureState((state: CaptureState) => setCaptureState(state))
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

      window.cosEditor
        .openBuffer({ bookId: selectedBook.id, section, slug, mode: bufferMode })
        .catch(console.error)

      window.cosEditor
        .loadHistory({ bookId: selectedBook.id, section, slug, mode: bufferMode })
        .then(setHistoryEntries)
        .catch(console.error)
    },
    [selectedBook, bufferMode],
  )

  const handleViewVersion = useCallback(
    (hash: string) => {
      if (!selectedBook || !bufferState) return
      if (bufferMode !== 'live') return // Version viewing only in live mode
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
    [selectedBook, bufferState, historyEntries, bufferMode],
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
            .openBuffer({ bookId: selectedBook.id, section, slug, mode: bufferMode })
            .catch(console.error)
          window.cosEditor
            .loadHistory({ bookId: selectedBook.id, section, slug, mode: bufferMode })
            .then(setHistoryEntries)
            .catch(console.error)
        })
        .catch(console.error)
    },
    [selectedBook, bufferState, bufferMode],
  )

  const handleCloseVersion = useCallback(() => {
    setViewingVersion(null)
  }, [])

  const handleBufferModeChange = useCallback(
    (mode: BufferMode) => {
      if (mode === bufferMode) return
      setBufferMode(mode)

      // Re-open current buffer in new mode
      if (selectedBook && bufferState) {
        window.cosEditor
          .openBuffer({
            bookId: selectedBook.id,
            section: bufferState.section as SectionType,
            slug: bufferState.slug,
            mode,
          })
          .catch(console.error)

        window.cosEditor
          .loadHistory({
            bookId: selectedBook.id,
            section: bufferState.section as SectionType,
            slug: bufferState.slug,
            mode,
          })
          .then(setHistoryEntries)
          .catch(console.error)
      }
    },
    [bufferMode, selectedBook, bufferState],
  )

  const handleAcceptDraft = useCallback(() => {
    if (!bufferState) return

    const doAccept = (): void => {
      window.cosEditor
        .acceptDraft({ actor: 'user' })
        .then(() => {
          setBufferMode('live')
        })
        .catch(console.error)
    }

    if (bufferState.dirty) {
      // Save first, then accept
      window.cosEditor
        .saveNow()
        .then(() => doAccept())
        .catch(console.error)
    } else {
      doAccept()
    }
  }, [bufferState])

  const handleConflictCancel = useCallback(() => {
    setConflict(null)
  }, [])

  const handleConflictReload = useCallback(() => {
    setConflict(null)
    window.cosEditor.reloadBuffer().catch(console.error)
  }, [])

  const handleConflictOverwrite = useCallback(() => {
    setConflict(null)
    window.cosEditor.forceSave().catch(console.error)
  }, [])

  const handleToggleCapture = useCallback(() => {
    setCaptureOpen((prev) => !prev)
  }, [])

  const handleCreateCapture = useCallback(
    (content: string) => {
      if (!selectedBook || !bufferState) return
      window.cosEditor
        .createCaptureTodo({
          content,
          bookId: selectedBook.id,
          section: bufferState.section,
          slug: bufferState.slug,
        })
        .catch(console.error)
    },
    [selectedBook, bufferState],
  )

  const handleApplyResult = useCallback((resultContent: string) => {
    window.cosEditor.applyChanges({ content: resultContent }).catch(console.error)
  }, [])

  const canAcceptDraft =
    bufferMode === 'draft' &&
    bufferState !== null &&
    !bufferState.dirty &&
    bufferState.headHash !== null

  return (
    <div className="flex flex-col h-full">
      <TopBar
        cosStatus={cosStatus}
        onSettingsClick={() => setSettingsOpen(true)}
        selectedBook={selectedBook}
        onSelectBook={handleSelectBook}
        bufferMode={bufferMode}
        onBufferModeChange={handleBufferModeChange}
        canAcceptDraft={canAcceptDraft}
        onAcceptDraft={handleAcceptDraft}
        captureOpen={captureOpen}
        onToggleCapture={handleToggleCapture}
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
        {captureOpen && (
          <CapturePanel
            captureState={captureState}
            onCreateCapture={handleCreateCapture}
            onApplyResult={handleApplyResult}
            onClose={() => setCaptureOpen(false)}
          />
        )}
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
      {conflict && (
        <ConflictDialog
          conflict={conflict}
          onCancel={handleConflictCancel}
          onReload={handleConflictReload}
          onOverwrite={handleConflictOverwrite}
        />
      )}
    </div>
  )
}

export default App
