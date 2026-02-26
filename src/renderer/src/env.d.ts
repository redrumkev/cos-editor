/// <reference types="vite/client" />

import type {
  BufferApplyChangesRequest,
  BufferOpenRequest,
  BufferState,
  ConnectionTestResult,
  CosStatus,
  Settings,
} from '../../shared/ipc'

interface CosEditorAPI {
  openBuffer: (req: BufferOpenRequest) => Promise<BufferState>
  applyChanges: (req: BufferApplyChangesRequest) => Promise<BufferState>
  saveNow: () => Promise<BufferState>
  getSettings: () => Promise<Settings>
  setSettings: (settings: Partial<Settings>) => Promise<Settings>
  testConnection: () => Promise<ConnectionTestResult>
  onBufferState: (callback: (state: BufferState) => void) => void
  onCosStatus: (callback: (status: CosStatus) => void) => void
}

// biome-ignore lint/correctness/noUnusedVariables: global Window augmentation for typed IPC bridge
interface Window {
  cosEditor: CosEditorAPI
  electron: import('@electron-toolkit/preload').ElectronAPI
}
