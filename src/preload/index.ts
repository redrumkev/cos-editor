import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  BookRecord,
  CaptureCreateRequest,
  CaptureItem,
  CaptureListRequest,
  CaptureSnapshot,
  CaptureSnapshotRequest,
  CaptureState,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  WriteResult,
} from '../shared/cos-types'
import type {
  AppCommand,
  BufferAcceptDraftRequest,
  BufferApplyChangesRequest,
  BufferConflict,
  BufferOpenRequest,
  BufferState,
  ConnectionTestResult,
  CosStatus,
  LayoutState,
  NavLoadHistoryRequest,
  NavLoadVersionRequest,
  NavRestoreVersionRequest,
  Settings,
} from '../shared/ipc'
import { IPC } from '../shared/ipc'

// COS Editor API exposed to renderer
const cosEditorApi = {
  // Buffer operations
  openBuffer: (req: BufferOpenRequest): Promise<BufferState> =>
    ipcRenderer.invoke(IPC.BUFFER_OPEN, req),

  applyChanges: (req: BufferApplyChangesRequest): Promise<BufferState> =>
    ipcRenderer.invoke(IPC.BUFFER_APPLY_CHANGES, req),

  saveNow: (): Promise<BufferState> => ipcRenderer.invoke(IPC.BUFFER_SAVE),

  reloadBuffer: (): Promise<BufferState> => ipcRenderer.invoke(IPC.BUFFER_RELOAD),

  forceSave: (): Promise<BufferState> => ipcRenderer.invoke(IPC.BUFFER_FORCE_SAVE),

  acceptDraft: (req: BufferAcceptDraftRequest): Promise<BufferState> =>
    ipcRenderer.invoke(IPC.BUFFER_ACCEPT_DRAFT, req),

  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, partial),

  testConnection: (): Promise<ConnectionTestResult> =>
    ipcRenderer.invoke(IPC.SETTINGS_TEST_CONNECTION),

  // Layout
  getLayout: (): Promise<LayoutState> => ipcRenderer.invoke(IPC.LAYOUT_GET),

  setLayout: (partial: Partial<LayoutState>): Promise<LayoutState> =>
    ipcRenderer.invoke(IPC.LAYOUT_SET, partial),

  // Navigation
  listBooks: (): Promise<BookRecord[]> => ipcRenderer.invoke(IPC.NAV_LIST_BOOKS),

  loadManuscript: (bookId: string): Promise<ManuscriptStructure> =>
    ipcRenderer.invoke(IPC.NAV_LOAD_MANUSCRIPT, bookId),

  loadHistory: (req: NavLoadHistoryRequest): Promise<CasHistoryEntry[]> =>
    ipcRenderer.invoke(IPC.NAV_LOAD_HISTORY, req),

  loadVersion: (req: NavLoadVersionRequest): Promise<ChapterContent> =>
    ipcRenderer.invoke(IPC.NAV_LOAD_VERSION, req),

  restoreVersion: (req: NavRestoreVersionRequest): Promise<WriteResult> =>
    ipcRenderer.invoke(IPC.NAV_RESTORE_VERSION, req),

  // Capture operations
  createCaptureTodo: (req: CaptureCreateRequest): Promise<CaptureItem> =>
    ipcRenderer.invoke(IPC.CAPTURE_CREATE_TODO, req),

  listCaptureTodos: (req?: CaptureListRequest): Promise<CaptureItem[]> =>
    ipcRenderer.invoke(IPC.CAPTURE_LIST_TODOS, req),

  getCaptureTodoSnapshot: (req: CaptureSnapshotRequest): Promise<CaptureSnapshot> =>
    ipcRenderer.invoke(IPC.CAPTURE_GET_SNAPSHOT, req),

  startCapturePolling: (todoId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.CAPTURE_START_POLLING, todoId),

  stopCapturePolling: (): Promise<void> => ipcRenderer.invoke(IPC.CAPTURE_STOP_POLLING),

  // Event listeners
  onBufferState: (callback: (state: BufferState) => void): void => {
    ipcRenderer.on(IPC.BUFFER_STATE, (_event, state) => callback(state))
  },

  onCosStatus: (callback: (status: CosStatus) => void): void => {
    ipcRenderer.on(IPC.COS_STATUS, (_event, status) => callback(status))
  },

  onBufferConflict: (callback: (conflict: BufferConflict) => void): void => {
    ipcRenderer.on(IPC.BUFFER_CONFLICT, (_event, conflict) => callback(conflict))
  },

  onCaptureState: (callback: (state: CaptureState) => void): void => {
    ipcRenderer.on(IPC.CAPTURE_STATE, (_event, state) => callback(state))
  },

  onAppCommand: (callback: (cmd: AppCommand) => void): void => {
    ipcRenderer.on(IPC.APP_COMMAND, (_event, cmd) => callback(cmd))
  },
}

// Use contextBridge to safely expose APIs
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('cosEditor', cosEditorApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.cosEditor = cosEditorApi
}
