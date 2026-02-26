import type { ElectronAPI } from '@electron-toolkit/preload'
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

interface CosEditorAPI {
  // Buffer operations
  openBuffer: (req: BufferOpenRequest) => Promise<BufferState>
  applyChanges: (req: BufferApplyChangesRequest) => Promise<BufferState>
  saveNow: () => Promise<BufferState>
  reloadBuffer: () => Promise<BufferState>
  forceSave: () => Promise<BufferState>
  acceptDraft: (req: BufferAcceptDraftRequest) => Promise<BufferState>

  // Settings
  getSettings: () => Promise<Settings>
  setSettings: (partial: Partial<Settings>) => Promise<Settings>
  testConnection: () => Promise<ConnectionTestResult>

  // Navigation
  listBooks: () => Promise<BookRecord[]>
  loadManuscript: (bookId: string) => Promise<ManuscriptStructure>
  loadHistory: (req: NavLoadHistoryRequest) => Promise<CasHistoryEntry[]>
  loadVersion: (req: NavLoadVersionRequest) => Promise<ChapterContent>
  restoreVersion: (req: NavRestoreVersionRequest) => Promise<WriteResult>

  // Capture operations
  createCaptureTodo: (req: CaptureCreateRequest) => Promise<CaptureItem>
  listCaptureTodos: (req?: CaptureListRequest) => Promise<CaptureItem[]>
  getCaptureTodoSnapshot: (req: CaptureSnapshotRequest) => Promise<CaptureSnapshot>
  startCapturePolling: (todoId: string) => Promise<void>
  stopCapturePolling: () => Promise<void>

  // Event listeners
  onBufferState: (callback: (state: BufferState) => void) => void
  onCosStatus: (callback: (status: CosStatus) => void) => void
  onBufferConflict: (callback: (conflict: BufferConflict) => void) => void
  onCaptureState: (callback: (state: CaptureState) => void) => void
  onAppCommand: (callback: (cmd: import('../shared/ipc').AppCommand) => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    cosEditor: CosEditorAPI
  }
}
