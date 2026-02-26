// IPC channel constants — single source of truth
export const IPC = {
  // Buffer operations (renderer -> main)
  BUFFER_OPEN: 'buffer:open',
  BUFFER_SAVE: 'buffer:save',
  BUFFER_APPLY_CHANGES: 'buffer:apply-changes',

  // Settings (renderer -> main)
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_TEST_CONNECTION: 'settings:test-connection',

  // Events (main -> renderer)
  BUFFER_STATE: 'buffer:state',
  COS_STATUS: 'cos:status',
} as const

// Payload types
export interface BufferOpenRequest {
  bookId: string
  section: 'front' | 'body' | 'back'
  slug: string
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
