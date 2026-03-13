// COS API TypeScript types — mirrors FastAPI backend schemas.
//
// Terminology boundaries:
// - zone/section: structural placement inside the manuscript tree
// - chapter_kind: semantic role of the chapter
// - chapter status: workflow lifecycle, not editor buffer mode
// - sandbox/live: editor stream selection, defined in shared/ipc.ts

export type ChapterZone = 'front' | 'body' | 'back' | 'floating'
export type SectionType = ChapterZone
export type ChapterKind = string
export type ChapterWorkflowStatus = 'draft' | 'review' | 'promoted' | 'locked'

// Chapter content from GET /manuscripts/{bookId}/chapters/{chapterId}
export interface ChapterContent {
  id: string
  slug: string
  title: string
  chapter_kind: ChapterKind
  zone: ChapterZone
  status: ChapterWorkflowStatus
  content_draft: string | null
  content_published: string | null
  word_count: number
  metadata: Record<string, unknown>
}

// Version response from PUT/DELETE/POST write endpoints
export interface VersionResponse {
  content_hash: string
  word_count: number
  created_at: string
  parent_hash: string | null
}

// Save chapter request body for PUT /manuscripts/{bookId}/chapters/{section}/{slug}
export interface SaveChapterRequest {
  title: string
  content_draft?: string | null
  content_published?: string | null
  metadata?: Record<string, unknown>
  expected_head?: string | null
}

// Delete chapter request body
export interface DeleteChapterRequest {
  expected_head?: string | null
}

// Publish chapter request body
export interface PublishChapterRequest {
  expected_head?: string | null
}

// Revert request body
export interface RevertRequest {
  target_hash: string
  expected_head?: string | null
}

// Reorder request body
export interface ReorderSectionRequest {
  chapter_slugs: string[]
  expected_head?: string | null
}

// Initialize manuscript request
export interface InitializeRequest {
  title: string
}

// Chapter summary from GET /manuscripts/{bookId}
export interface ChapterSummary {
  id: string
  slug: string
  title: string
  chapter_kind: ChapterKind
  status: ChapterWorkflowStatus
  word_count: number
  has_content: boolean
}

// Manuscript structure from GET /manuscripts/{bookId}
export interface ManuscriptStructure {
  book_id: string
  title: string
  front: ChapterSummary[]
  body: ChapterSummary[]
  back: ChapterSummary[]
  floating: ChapterSummary[]
  structure_version: number
  created_at: string
  updated_at: string
}

// CAS history entry from history endpoints
export interface CasHistoryEntry {
  hash: string
  parent_hash: string | null
  created_at: string
  metadata: Record<string, unknown>
}

// Sandbox chapter summary
export interface SandboxChapterSummary {
  slug: string
  title: string
  word_count: number
  has_content: boolean
}

// Accept sandbox request
export interface AcceptSandboxRequest {
  expected_sandbox_head?: string | null
  expected_live_head?: string | null
  actor?: string
}

// Accept sandbox response
export interface AcceptSandboxResponse {
  content_hash: string
  word_count: number
  accepted_from_sandbox_hash: string
}

// Write result from save/revert operations
export interface WriteResult {
  response: VersionResponse
  contentHash: string
}

// Book record from GET /books/{bookId}
export interface BookRecord {
  id: string
  tenant_id: string
  book_code: string
  title: string
  series_id: string | null
  series_position: number | null
  status: string
  created_at: string
  updated_at: string
  published_at: string | null
}

// Capture types
export interface CaptureItem {
  id: string
  content: string
  status: string
  priority: string
  source_surface: string
  source_context: Record<string, string>
  tags: string[]
  created_at: string
}

export interface CaptureTask {
  id: string
  todo_id: string
  task_type: string
  status: string
  instructions: string
  created_at: string
  claimed_at?: string
  completed_at?: string
}

export interface CaptureResult {
  id: string
  task_id: string
  status: string
  score?: number
  result: { content: string; model?: string }
  created_at: string
}

export interface CaptureSnapshot {
  todo: CaptureItem
  tasks: CaptureTask[]
  results: CaptureResult[]
}

export interface CaptureCreateRequest {
  content: string
  bookId: string
  section: string
  slug: string
}

export interface CaptureListRequest {
  active?: boolean
}

export interface CaptureSnapshotRequest {
  todoId: string
}

export interface CaptureState {
  todos: CaptureItem[]
  activeSnapshot?: CaptureSnapshot
}
