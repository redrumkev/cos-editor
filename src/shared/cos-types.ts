// COS API TypeScript types — mirrors FastAPI backend schemas

// Section types
export type SectionType = 'front' | 'body' | 'back'

// Chapter content from GET /manuscripts/{bookId}/chapters/{section}/{slug}
export interface ChapterContent {
  slug: string
  title: string
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

// Manuscript structure from GET /manuscripts/{bookId}
export interface BookSection {
  section_type: SectionType
  chapters: ChapterContent[]
  metadata: Record<string, unknown>
}

export interface ManuscriptStructure {
  book_id: string
  title: string
  front: BookSection
  body: BookSection
  back: BookSection
  version: number
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

// Draft chapter summary
export interface DraftChapterSummary {
  slug: string
  title: string
  word_count: number
  has_content: boolean
}

// Accept draft request
export interface AcceptDraftRequest {
  expected_draft_head?: string | null
  expected_live_head?: string | null
  actor?: string
}

// Accept draft response
export interface AcceptDraftResponse {
  content_hash: string
  word_count: number
  accepted_from_draft_hash: string
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
