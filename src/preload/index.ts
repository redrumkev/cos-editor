import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  BufferApplyChangesRequest,
  BufferOpenRequest,
  BufferState,
  ConnectionTestResult,
  CosStatus,
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

  // Settings
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, partial),

  testConnection: (): Promise<ConnectionTestResult> =>
    ipcRenderer.invoke(IPC.SETTINGS_TEST_CONNECTION),

  // Event listeners
  onBufferState: (callback: (state: BufferState) => void): void => {
    ipcRenderer.on(IPC.BUFFER_STATE, (_event, state) => callback(state))
  },

  onCosStatus: (callback: (status: CosStatus) => void): void => {
    ipcRenderer.on(IPC.COS_STATUS, (_event, status) => callback(status))
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
