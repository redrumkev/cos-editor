// IPC channel constants — single source of truth
export const IPC = {
  // Buffer operations (renderer -> main)
  BUFFER_OPEN: 'buffer:open',
  BUFFER_SAVE: 'buffer:save',
  BUFFER_APPLY_CHANGES: 'buffer:apply-changes',
  BUFFER_RELOAD: 'buffer:reload',
  BUFFER_FORCE_SAVE: 'buffer:force-save',
  BUFFER_ACCEPT_DRAFT: 'buffer:accept-draft',

  // Settings (renderer -> main)
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_TEST_CONNECTION: 'settings:test-connection',

  // Navigation operations (renderer -> main)
  NAV_LIST_BOOKS: 'nav:list-books',
  NAV_LOAD_MANUSCRIPT: 'nav:load-manuscript',
  NAV_LOAD_HISTORY: 'nav:load-history',
  NAV_LOAD_VERSION: 'nav:load-version',
  NAV_RESTORE_VERSION: 'nav:restore-version',

  // Events (main -> renderer)
  BUFFER_STATE: 'buffer:state',
  BUFFER_CONFLICT: 'buffer:conflict',
  COS_STATUS: 'cos:status',
} as const

// Buffer mode
export type BufferMode = 'live' | 'draft'

// Payload types
export interface BufferOpenRequest {
  bookId: string
  section: 'front' | 'body' | 'back'
  slug: string
  mode?: BufferMode
}

export interface BufferApplyChangesRequest {
  content: string
}

export interface BufferState {
  bookId: string
  section: string
  slug: string
  content: string
  dirty: boolean
  headHash: string | null
  lastSavedAt: string | null
  wordCount: number
  mode: BufferMode
  liveHeadHash: string | null
}

export interface CosStatus {
  connected: boolean
  apiUrl: string
  error?: string
}

export interface Settings {
  cosApiUrl: string
  cosTenantId: string
}

export type ConnectionTestResult = {
  success: boolean
  message: string
  latencyMs?: number
}

export interface NavLoadHistoryRequest {
  bookId: string
  section: 'front' | 'body' | 'back'
  slug: string
  mode?: BufferMode
}

export interface BufferAcceptDraftRequest {
  actor?: string
}

export interface BufferConflict {
  operation: 'save' | 'accept'
  mode: BufferMode
  message: string
}

export interface NavLoadVersionRequest {
  bookId: string
  section: 'front' | 'body' | 'back'
  slug: string
  hash: string
}

export interface NavRestoreVersionRequest {
  bookId: string
  section: 'front' | 'body' | 'back'
  slug: string
  targetHash: string
  expectedHead?: string | null
}
