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
  reloadBuffer: () => Promise<BufferState>
  forceSave: () => Promise<BufferState>
  acceptSandbox: (req: { actor?: string }) => Promise<BufferState>
  getSettings: () => Promise<Settings>
  setSettings: (settings: Partial<Settings>) => Promise<Settings>
  testConnection: () => Promise<ConnectionTestResult>
  getLayout: () => Promise<import('../../shared/ipc').LayoutState>
  setLayout: (
    settings: Partial<import('../../shared/ipc').LayoutState>,
  ) => Promise<import('../../shared/ipc').LayoutState>
  listBooks: () => Promise<import('../../shared/cos-types').BookRecord[]>
  loadManuscript: (bookId: string) => Promise<import('../../shared/cos-types').ManuscriptStructure>
  loadHistory: (
    req: import('../../shared/ipc').NavLoadHistoryRequest,
  ) => Promise<import('../../shared/cos-types').CasHistoryEntry[]>
  loadVersion: (
    req: import('../../shared/ipc').NavLoadVersionRequest,
  ) => Promise<import('../../shared/cos-types').ChapterContent>
  restoreVersion: (
    req: import('../../shared/ipc').NavRestoreVersionRequest,
  ) => Promise<import('../../shared/cos-types').WriteResult>
  createCaptureTodo: (
    req: import('../../shared/cos-types').CaptureCreateRequest,
  ) => Promise<import('../../shared/cos-types').CaptureItem>
  onBufferConflict: (
    callback: (conflict: import('../../shared/ipc').BufferConflict) => void,
  ) => void
  onCaptureState: (callback: (state: import('../../shared/cos-types').CaptureState) => void) => void
  onAppCommand: (callback: (cmd: import('../../shared/ipc').AppCommand) => void) => void
  onBufferState: (callback: (state: BufferState) => void) => void
  onCosStatus: (callback: (status: CosStatus) => void) => void
}

// biome-ignore lint/correctness/noUnusedVariables: global Window augmentation for typed IPC bridge
interface Window {
  cosEditor: CosEditorAPI
  electron: import('@electron-toolkit/preload').ElectronAPI
}
