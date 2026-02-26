import type {
  AcceptDraftRequest,
  AcceptDraftResponse,
  BookRecord,
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

  async getManuscript(bookId: string): Promise<ManuscriptStructure> {
    return this.json<ManuscriptStructure>(`/manuscripts/${bookId}`)
  }

  async getChapter(
    bookId: string,
    section: SectionType,
    slug: string,
  ): Promise<{ chapter: ChapterContent; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${section}/${slug}`)
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

  async getDraftChapter(
    bookId: string,
    section: SectionType,
    slug: string,
  ): Promise<{ chapter: ChapterContent; contentHash: string }> {
    const res = await this.request(`/manuscripts/${bookId}/chapters/${section}/${slug}/draft`)
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

  async getBook(bookId: string): Promise<BookRecord> {
    return this.json<BookRecord>(`/books/${bookId}`)
  }

  // --- WRITE endpoints ---

  async saveChapter(
    bookId: string,
    section: SectionType,
    slug: string,
    body: SaveChapterRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${section}/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async saveDraftChapter(
    bookId: string,
    section: SectionType,
    slug: string,
    body: SaveChapterRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${section}/${slug}/draft`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async deleteChapter(
    bookId: string,
    section: SectionType,
    slug: string,
    body: DeleteChapterRequest = {},
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${section}/${slug}`, {
      method: 'DELETE',
      body: JSON.stringify(body),
    })
  }

  async publishChapter(
    bookId: string,
    section: SectionType,
    slug: string,
    body: PublishChapterRequest = {},
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${section}/${slug}/publish`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async revertChapter(
    bookId: string,
    section: SectionType,
    slug: string,
    body: RevertRequest,
  ): Promise<WriteResult> {
    return this.writeRequest(`/manuscripts/${bookId}/chapters/${section}/${slug}/revert`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async acceptDraft(
    bookId: string,
    section: SectionType,
    slug: string,
    body: AcceptDraftRequest = {},
  ): Promise<{ response: AcceptDraftResponse; contentHash: string }> {
    const res = await this.request(
      `/manuscripts/${bookId}/chapters/${section}/${slug}/draft/accept`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    )
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

  async getChapterHistory(
    bookId: string,
    section: SectionType,
    slug: string,
  ): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(
      `/manuscripts/${bookId}/chapters/${section}/${slug}/history`,
    )
  }

  async getDraftChapterHistory(
    bookId: string,
    section: SectionType,
    slug: string,
  ): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(
      `/manuscripts/${bookId}/chapters/${section}/${slug}/draft/history`,
    )
  }

  async getSectionHistory(bookId: string, section: SectionType): Promise<CasHistoryEntry[]> {
    return this.json<CasHistoryEntry[]>(`/manuscripts/${bookId}/sections/${section}/history`)
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
