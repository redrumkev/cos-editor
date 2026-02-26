import type { ElectronAPI } from '@electron-toolkit/preload'
import type {
  BookRecord,
  CasHistoryEntry,
  ChapterContent,
  ManuscriptStructure,
  WriteResult,
} from '../shared/cos-types'
import type {
  BufferApplyChangesRequest,
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
