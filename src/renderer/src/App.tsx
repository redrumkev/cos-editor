import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BookRecord,
  CaptureState,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  SectionType,
} from '../../shared/cos-types'
import type {
  BufferConflict,
  BufferMode,
  BufferState,
  CosStatus,
  LayoutState,
} from '../../shared/ipc'
import { CapturePanel } from './components/CapturePanel'
import { CommandPalette } from './components/CommandPalette'
import { ConflictDialog } from './components/ConflictDialog'
import { ConnectionBanner } from './components/ConnectionBanner'
import { LeftPane } from './components/LeftPane'
import { PreviewPane } from './components/PreviewPane'
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
  const [leftPaneOpen, setLeftPaneOpen] = useState(true)
  const [leftPaneWidth, setLeftPaneWidth] = useState(240)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [captureWidth, setCaptureWidth] = useState(320)
  const [chapterLoading, setChapterLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStateRef = useRef<{
    panel: 'left' | 'capture'
    startX: number
    startWidth: number
  } | null>(null)

  // Track whether layout has been restored to avoid saving defaults back
  const layoutRestoredRef = useRef(false)

  useEffect(() => {
    window.cosEditor.onBufferState((state: BufferState) => {
      setBufferState(state)
      setChapterLoading(false)
    })
    window.cosEditor.onCosStatus((status: CosStatus) => setCosStatus(status))
    window.cosEditor.onBufferConflict((c: BufferConflict) => setConflict(c))
    window.cosEditor.onCaptureState((state: CaptureState) => setCaptureState(state))

    // Restore layout state
    window.cosEditor
      .getLayout()
      .then((saved: LayoutState) => {
        setLeftPaneOpen(saved.leftPaneOpen)
        setCaptureOpen(saved.captureOpen)
        setActiveTab(saved.activeTab as TabId)

        if (saved.lastBookId) {
          // Load books and auto-select the saved one
          window.cosEditor
            .listBooks()
            .then((books: BookRecord[]) => {
              const book = books.find((b) => b.id === saved.lastBookId)
              if (book) {
                setSelectedBook(book)
                window.cosEditor
                  .loadManuscript(book.id)
                  .then((ms) => {
                    setManuscript(ms)

                    // Re-open last chapter if saved
                    if (saved.lastChapterPath) {
                      const [section, slug] = saved.lastChapterPath.split('/') as [
                        SectionType,
                        string,
                      ]
                      if (section && slug) {
                        window.cosEditor
                          .openBuffer({ bookId: book.id, section, slug, mode: 'live' })
                          .catch(console.error)
                        window.cosEditor
                          .loadHistory({ bookId: book.id, section, slug, mode: 'live' })
                          .then(setHistoryEntries)
                          .catch(console.error)
                      }
                    }

                    layoutRestoredRef.current = true
                  })
                  .catch((err) => {
                    console.error('[layout] Failed to restore manuscript:', err)
                    layoutRestoredRef.current = true
                  })
              } else {
                layoutRestoredRef.current = true
              }
            })
            .catch((err) => {
              console.error('[layout] Failed to list books for restore:', err)
              layoutRestoredRef.current = true
            })
        } else {
          layoutRestoredRef.current = true
        }
      })
      .catch((err) => {
        console.error('[layout] Failed to restore layout:', err)
        layoutRestoredRef.current = true
      })
  }, [])

  const handleEditorChange = useCallback((content: string) => {
    window.cosEditor.applyChanges({ content })
  }, [])

  const handleSelectBook = useCallback((book: BookRecord) => {
    setSelectedBook(book)
    setHistoryEntries([])
    setViewingVersion(null)
    setChapterLoading(true)
    window.cosEditor.loadManuscript(book.id).then(setManuscript).catch(console.error)
  }, [])

  const handleSelectChapter = useCallback(
    (section: SectionType, slug: string) => {
      if (!selectedBook) return
      setViewingVersion(null)
      setChapterLoading(true)

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
      setChapterLoading(true)

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

  // Refs to avoid stale closures in the IPC callback
  const bufferModeRef = useRef(bufferMode)
  useEffect(() => {
    bufferModeRef.current = bufferMode
  }, [bufferMode])
  const handleBufferModeChangeRef = useRef(handleBufferModeChange)
  useEffect(() => {
    handleBufferModeChangeRef.current = handleBufferModeChange
  }, [handleBufferModeChange])

  // Subscribe to app commands from native menu
  useEffect(() => {
    window.cosEditor.onAppCommand((cmd) => {
      switch (cmd.type) {
        case 'save':
          window.cosEditor.saveNow()
          break
        case 'force-save':
          window.cosEditor.forceSave()
          break
        case 'toggle-settings':
          setSettingsOpen((v) => !v)
          break
        case 'toggle-left-pane':
          setLeftPaneOpen((v) => !v)
          break
        case 'toggle-capture-pane':
          setCaptureOpen((v) => !v)
          break
        case 'toggle-buffer-mode':
          handleBufferModeChangeRef.current(bufferModeRef.current === 'live' ? 'draft' : 'live')
          break
        case 'open-command-palette':
          setCommandPaletteOpen(true)
          break
        case 'toggle-preview':
          setShowPreview((v) => !v)
          break
      }
    })
  }, [])

  // Global Escape handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (conflict) {
        setConflict(null)
        return
      }
      if (settingsOpen) {
        setSettingsOpen(false)
        return
      }
      if (commandPaletteOpen) {
        setCommandPaletteOpen(false)
        return
      }
      if (viewingVersion) {
        setViewingVersion(null)
        return
      }
      if (captureOpen) {
        setCaptureOpen(false)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [conflict, settingsOpen, commandPaletteOpen, viewingVersion, captureOpen])

  // Keyboard shortcut: Cmd+Shift+P toggles preview
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        setShowPreview((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced layout persistence
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!layoutRestoredRef.current) return

    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current)
    layoutTimerRef.current = setTimeout(() => {
      const lastBookId = selectedBook?.id ?? null
      const lastChapterPath = bufferState ? `${bufferState.section}/${bufferState.slug}` : null

      window.cosEditor
        .setLayout({
          leftPaneOpen,
          captureOpen,
          activeTab,
          lastBookId,
          lastChapterPath,
        })
        .catch(console.error)
    }, 1000)

    return () => {
      if (layoutTimerRef.current) {
        clearTimeout(layoutTimerRef.current)
        // Flush on unmount: save immediately
        const lastBookId = selectedBook?.id ?? null
        const lastChapterPath = bufferState ? `${bufferState.section}/${bufferState.slug}` : null

        window.cosEditor
          .setLayout({
            leftPaneOpen,
            captureOpen,
            activeTab,
            lastBookId,
            lastChapterPath,
          })
          .catch(console.error)
      }
    }
  }, [leftPaneOpen, captureOpen, activeTab, selectedBook, bufferState])

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

  const handleLeftResizeStart = useCallback(
    (event: React.MouseEvent) => {
      if (!leftPaneOpen) return
      resizeStateRef.current = {
        panel: 'left',
        startX: event.clientX,
        startWidth: leftPaneWidth,
      }
      setIsResizing(true)
    },
    [leftPaneOpen, leftPaneWidth],
  )

  const handleCaptureResizeStart = useCallback(
    (event: React.MouseEvent) => {
      if (!captureOpen) return
      resizeStateRef.current = {
        panel: 'capture',
        startX: event.clientX,
        startWidth: captureWidth,
      }
      setIsResizing(true)
    },
    [captureOpen, captureWidth],
  )

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const resize = resizeStateRef.current
      if (!resize) return

      if (resize.panel === 'left') {
        const nextWidth = Math.max(
          180,
          Math.min(400, resize.startWidth + (event.clientX - resize.startX)),
        )
        setLeftPaneWidth(nextWidth)
        return
      }

      const nextWidth = Math.max(
        240,
        Math.min(480, resize.startWidth - (event.clientX - resize.startX)),
      )
      setCaptureWidth(nextWidth)
    }

    function stopResize() {
      resizeStateRef.current = null
      setIsResizing(false)
    }

    if (isResizing) {
      document.documentElement.style.cursor = 'col-resize'
      document.documentElement.style.userSelect = 'none'
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopResize)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopResize)
      document.documentElement.style.cursor = ''
      document.documentElement.style.userSelect = ''
    }
  }, [isResizing])

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
        <div
          className="overflow-hidden shrink-0"
          style={{
            width: leftPaneOpen ? leftPaneWidth + 4 : 0,
            transition: 'width var(--duration-slow) var(--ease-out)',
          }}
        >
          <div className="flex h-full" style={{ width: leftPaneWidth + 4 }}>
            <LeftPane
              width={leftPaneWidth}
              manuscript={manuscript}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              bufferState={bufferState}
              historyEntries={historyEntries}
              onSelectChapter={handleSelectChapter}
              onViewVersion={handleViewVersion}
              activeVersionHash={viewingVersion?.hash ?? null}
            />
            <button
              type="button"
              aria-label="Resize left pane"
              onMouseDown={handleLeftResizeStart}
              className="group relative h-full w-1 shrink-0 cursor-col-resize bg-transparent transition-colors duration-[--duration-normal] focus-visible:outline-none focus-visible:bg-bg-hover"
            >
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/40 transition-colors duration-[--duration-normal] group-hover:bg-accent/70 group-focus-visible:bg-accent/70" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex">
          <div className="flex-1 min-w-0">
            <EditorMount
              loading={chapterLoading || !bufferState}
              content={bufferState?.content ?? ''}
              onChange={handleEditorChange}
            />
          </div>
          {showPreview && (
            <>
              <div className="w-px shrink-0 bg-border/40" />
              <div className="flex-1 min-w-0">
                <PreviewPane content={bufferState?.content ?? ''} />
              </div>
            </>
          )}
        </div>
        <div
          className="overflow-hidden shrink-0"
          style={{
            width: captureOpen ? captureWidth + 4 : 0,
            transition: 'width var(--duration-slow) var(--ease-out)',
          }}
        >
          <div className="flex h-full" style={{ width: captureWidth + 4 }}>
            <button
              type="button"
              aria-label="Resize capture panel"
              onMouseDown={handleCaptureResizeStart}
              className="group relative h-full w-1 shrink-0 cursor-col-resize bg-transparent transition-colors duration-[--duration-normal] focus-visible:outline-none focus-visible:bg-bg-hover"
            >
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/40 transition-colors duration-[--duration-normal] group-hover:bg-accent/70 group-focus-visible:bg-accent/70" />
            </button>
            <CapturePanel
              width={captureWidth}
              captureState={captureState}
              onCreateCapture={handleCreateCapture}
              onApplyResult={handleApplyResult}
              onClose={() => setCaptureOpen(false)}
            />
          </div>
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
      {conflict && (
        <ConflictDialog
          conflict={conflict}
          onCancel={handleConflictCancel}
          onReload={handleConflictReload}
          onOverwrite={handleConflictOverwrite}
        />
      )}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSave={() => window.cosEditor.saveNow()}
        onForceSave={() => window.cosEditor.forceSave()}
        onToggleMode={() => handleBufferModeChange(bufferMode === 'live' ? 'draft' : 'live')}
        onToggleLeftPane={() => setLeftPaneOpen((v) => !v)}
        onToggleCapturePane={() => setCaptureOpen((v) => !v)}
        onTogglePreview={() => setShowPreview((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        canAcceptDraft={canAcceptDraft}
        onAcceptDraft={handleAcceptDraft}
      />
    </div>
  )
}

export default App
