import type {
  AcceptDraftRequest,
  AcceptDraftResponse,
  BookRecord,
  CaptureCreateRequest,
  CaptureItem,
  CaptureSnapshot,
  CasHistoryEntry,
  ChapterContent,
  DeleteChapterRequest,
  InitializeRequest,
  ManuscriptStructure,
  PublishChapterRequest,
  ReorderSectionRequest,
  RevertRequest,
  SaveChapterRequest,
  SectionType,
  VersionResponse,
} from '../shared/cos-types'

// --- Error types ---

export class CosClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'CosClientError'
  }
}

export class ConcurrentModificationError extends CosClientError {
  constructor(message: string, body?: unknown) {
    super(message, 409, body)
    this.name = 'ConcurrentModificationError'
  }
}

export class NotFoundError extends CosClientError {
  constructor(message: string, body?: unknown) {
    super(message, 404, body)
    this.name = 'NotFoundError'
  }
}

// --- Write result type ---

export interface WriteResult {
  response: VersionResponse
  contentHash: string
}

// --- Client ---

export class CosClient {
  private baseUrl: string
  private tenantId: string

  constructor(baseUrl: string, tenantId: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.tenantId = tenantId
  }

  updateConfig(baseUrl: string, tenantId: string): void {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.tenantId = tenantId
  }

  // --- Helpers ---

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
    }
  }

  private async request<_T>(path: string, init?: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    let res: Response
    try {
      res = await fetch(url, {
        ...init,
        headers: { ...this.headers, ...init?.headers },
      })
    } catch (err) {
      throw new CosClientError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        0,
      )
    }

    if (!res.ok) {
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = await res.text().catch(() => null)
      }

      if (res.status === 409) {
        throw new ConcurrentModificationError(`Concurrent modification on ${path}`, body)
      }
      if (res.status === 404) {
        throw new NotFoundError(`Not found: ${path}`, body)
      }
      throw new CosClientError(
        `HTTP ${res.status} on ${init?.method ?? 'GET'} ${path}`,
        res.status,
        body,
      )
    }

    return res
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.request<T>(path, init)
    return (await res.json()) as T
  }

  private async writeRequest(path: string, init: RequestInit): Promise<WriteResult> {
    const res = await this.request(path, init)
    const response = (await res.json()) as VersionResponse

    // Extract content hash from ETag header (quoted) or X-Content-Hash (raw)
    let contentHash = response.content_hash
    const etag = res.headers.get('ETag')
    if (etag) {
      contentHash = etag.replace(/^"|"$/g, '')
    }
    const xContentHash = res.headers.get('X-Content-Hash')
    if (xContentHash) {
      contentHash = xContentHash
    }

    return { response, contentHash }
  }

  // --- READ endpoints ---

  async listBooks(): Promise<BookRecord[]> {
    return this.json<BookRecord[]>('/books')
  }

  async getManuscript(bookId: string): Promise<ManuscriptStructure> {
    return this.json<ManuscriptStructure>(`/manuscripts/${bookId}`)
  }

  async getChapter(
    bookId: string,
    chapterId: string,
  ): Promise<{ chapter: ChapterContent; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${chapterId}`)
    const chapter = (await res.json()) as ChapterContent

    let contentHash = ''
    const etag = res.headers.get('ETag')
    if (etag) {
      contentHash = etag.replace(/^"|"$/g, '')
    }
    const xContentHash = res.headers.get('X-Content-Hash')
    if (xContentHash) {
      contentHash = xContentHash
    }

    return { chapter, contentHash }
  }

  async getSandboxChapter(
    bookId: string,
    chapterId: string,
  ): Promise<{ chapter: ChapterContent; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${chapterId}/sandbox`)
    const chapter = (await res.json()) as ChapterContent

    let contentHash = ''
    const etag = res.headers.get('ETag')
    if (etag) {
      contentHash = etag.replace(/^"|"$/g, '')
    }
    const xContentHash = res.headers.get('X-Content-Hash')
    if (xContentHash) {
      contentHash = xContentHash
    }

    return { chapter, contentHash }
  }

  async getChapterAtHash(
    bookId: string,
    chapterId: string,
    hash: string,
  ): Promise<{ chapter: ChapterContent; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${chapterId}/at/${hash}`)
    const chapter = (await res.json()) as ChapterContent

    let contentHash = hash
    const etag = res.headers.get('ETag')
    if (etag) {
      contentHash = etag.replace(/^"|"$/g, '')
    }
    const xContentHash = res.headers.get('X-Content-Hash')
    if (xContentHash) {
      contentHash = xContentHash
    }

    return { chapter, contentHash }
  }

  async getBook(bookId: string): Promise<BookRecord> {
    return this.json<BookRecord>(`/books/${bookId}`)
  }

  // --- WRITE endpoints ---

  async saveChapter(
    bookId: string,
    chapterId: string,
    body: SaveChapterRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async saveSandboxChapter(
    bookId: string,
    chapterId: string,
    body: SaveChapterRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${chapterId}/sandbox`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async deleteChapter(
    bookId: string,
    chapterId: string,
    body: DeleteChapterRequest = {},
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${chapterId}`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    })
  }

  async publishChapter(
    bookId: string,
    chapterId: string,
    body: PublishChapterRequest = {},
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${chapterId}/publish`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async revertChapter(
    bookId: string,
    chapterId: string,
    body: RevertRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${chapterId}/revert`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async acceptSandbox(
    bookId: string,
    chapterId: string,
    body: AcceptDraftRequest = {},
  ): Promise<{ response: AcceptDraftResponse; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${chapterId}/sandbox/accept`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const response = (await res.json()) as AcceptDraftResponse

    let contentHash = response.content_hash
    const etag = res.headers.get('ETag')
    if (etag) {
      contentHash = etag.replace(/^"|"$/g, '')
    }
    const xContentHash = res.headers.get('X-Content-Hash')
    if (xContentHash) {
      contentHash = xContentHash
    }

    return { response, contentHash }
  }

  async reorderSection(
    bookId: string,
    section: SectionType,
    body: ReorderSectionRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/sections/${section}/reorder`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async initializeManuscript(bookId: string, body: InitializeRequest): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/initialize`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // --- HISTORY endpoints ---

  async getChapterHistory(bookId: string, chapterId: string): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(`/manuscripts/${bookId}/chapters/${chapterId}/history`)
  }

  async getSandboxChapterHistory(bookId: string, chapterId: string): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(
      `/manuscripts/${bookId}/chapters/${chapterId}/sandbox/history`,
    )
  }

  async getSectionHistory(bookId: string, section: SectionType): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(`/manuscripts/${bookId}/sections/${section}/history`)
  }

  // --- CAPTURE endpoints ---

  async createCaptureTodo(body: CaptureCreateRequest): Promise<CaptureItem> {
    const res = await this.request('/capture/todos', {
      method: 'POST',
      body: JSON.stringify({
        content: body.content,
        source_surface: 'book_editor',
        source_context: {
          book_id: body.bookId,
          section: body.section,
          slug: body.slug,
        },
      }),
    })
    return res.json() as Promise<CaptureItem>
  }

  async getCaptureTodo(todoId: string): Promise<CaptureItem> {
    return this.json<CaptureItem>(`/capture/todos/${todoId}`)
  }

  async getCaptureTodoSnapshot(todoId: string): Promise<CaptureSnapshot> {
    return this.json<CaptureSnapshot>(`/capture/todos/${todoId}/snapshot`)
  }

  async listCaptureTodos(params?: {
    active?: boolean
    sourceSurface?: string
  }): Promise<CaptureItem[]> {
    const searchParams = new URLSearchParams()
    if (params?.active) searchParams.set('active', 'true')
    if (params?.sourceSurface) searchParams.set('source_surface', params.sourceSurface)
    const query = searchParams.toString()
    return this.json<CaptureItem[]>(`/capture/todos${query ? `?${query}` : ''}`)
  }

  // --- HEALTH ---

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = performance.now()
    try {
      await this.request('/health')
      return { ok: true, latencyMs: Math.round(performance.now() - start) }
    } catch {
      return { ok: false, latencyMs: Math.round(performance.now() - start) }
    }
  }
}
