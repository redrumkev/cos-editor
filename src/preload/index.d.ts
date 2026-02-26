import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  BufferApplyChangesRequest,
  BufferOpenRequest,
  BufferState,
  ConnectionTestResult,
  CosStatus,
  Settings,
} from '../shared/ipc'

interface CosEditorAPI {
  // Buffer operations
  openBuffer: (req: BufferOpenRequest) => Promise<BufferState>
  applyChanges: (req: BufferApplyChangesRequest) => Promise<BufferState>
  saveNow: () => Promise<BufferState>

  // Settings
  getSettings: () => Promise<Settings>
  setSettings: (partial: Partial<Settings>) => Promise<Settings>
  testConnection: () => Promise<ConnectionTestResult>

  // Event listeners
  onBufferState: (callback: (state: BufferState) => void) => void
  onCosStatus: (callback: (status: CosStatus) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    cosEditor: CosEditorAPI
  }
}
