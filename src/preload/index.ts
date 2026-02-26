import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  BookRecord,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  WriteResult,
} from '../shared/cos-types'
import type {
  BufferAcceptDraftRequest,
  BufferApplyChangesRequest,
  BufferConflict,
  BufferOpenRequest,
  BufferState,
  ConnectionTestResult,
  CosStatus,
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
