import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create mock Response
function mockResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(headers),
  }
}

describe('CosClient', () => {
  // Import dynamically after mock is set up
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for test setup
  let CosClient: any

  beforeEach(async () => {
    mockFetch.mockReset()
    // Dynamic import to ensure mock is in place
    const mod = await import('../../src/main/cos-client')
    CosClient = mod.CosClient
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getChapter', () => {
    it('constructs correct URL for chapter', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Chapter 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"abc123"', 'X-Content-Hash': 'abc123' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.getChapter('book-id', 'body', 'ch-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/manuscripts/book-id/chapters/body/ch-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Tenant-ID': 'default',
          }),
        }),
      )
    })

    it('constructs correct URL for front section', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'preface',
            title: 'Preface',
            content_draft: '# Preface',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"def456"', 'X-Content-Hash': 'def456' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.getChapter('my-book', 'front', 'preface')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/manuscripts/my-book/chapters/front/preface',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'default',
          }),
        }),
      )
    })

    it('extracts content hash from ETag header (strips quotes)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Chapter 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"abc123"', 'X-Content-Hash': 'abc123' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.getChapter('book-id', 'body', 'ch-1')

      expect(result.contentHash).toBe('abc123')
    })

    it('extracts X-Content-Hash header', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Chapter 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"hash-value"', 'X-Content-Hash': 'hash-value' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.getChapter('book-id', 'body', 'ch-1')

      // contentHash should match either ETag (unquoted) or X-Content-Hash
      expect(result.contentHash).toBe('hash-value')
    })

    it('returns chapter data nested under chapter key', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Chapter 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"abc123"', 'X-Content-Hash': 'abc123' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.getChapter('book-id', 'body', 'ch-1')

      expect(result.chapter.slug).toBe('ch-1')
      expect(result.chapter.title).toBe('Chapter 1')
      expect(result.chapter.content_draft).toBe('# Hello')
    })
  })

  describe('getManuscript', () => {
    it('constructs correct URL for manuscript', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            book_id: 'book-1',
            title: 'My Book',
            front: { section_type: 'front', chapters: [], metadata: {} },
            body: { section_type: 'body', chapters: [], metadata: {} },
            back: { section_type: 'back', chapters: [], metadata: {} },
            version: 1,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
          200,
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.getManuscript('book-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/manuscripts/book-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'default',
          }),
        }),
      )
    })
  })

  describe('getBook', () => {
    it('constructs correct URL for single book', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          id: 'book-1',
          tenant_id: 'default',
          book_code: 'BOOK1',
          title: 'My Book',
          series_id: null,
          series_position: null,
          status: 'draft',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          published_at: null,
        }),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.getBook('book-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/books/book-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'default',
          }),
        }),
      )
    })
  })

  describe('saveChapter', () => {
    it('sends expected_head in request body (NOT If-Match header)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            content_hash: 'new-hash',
            word_count: 10,
            created_at: '2026-01-01',
            parent_hash: 'abc123',
          },
          200,
          { ETag: '"new-hash"', 'X-Content-Hash': 'new-hash' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.saveChapter('book-id', 'body', 'ch-1', {
        title: 'Chapter 1',
        content_draft: '# Updated',
        expected_head: 'abc123',
      })

      const [, opts] = mockFetch.mock.calls[0]
      const body = JSON.parse(opts.body)
      expect(body.expected_head).toBe('abc123')
      expect(opts.method).toBe('PUT')
      // Verify If-Match is NOT used — expected_head goes in body
      expect(opts.headers?.['If-Match']).toBeUndefined()
    })

    it('constructs correct URL for save', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            content_hash: 'new-hash',
            word_count: 5,
            created_at: '2026-01-01',
            parent_hash: null,
          },
          200,
          { ETag: '"new-hash"', 'X-Content-Hash': 'new-hash' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      await client.saveChapter('book-id', 'back', 'appendix-a', {
        title: 'Appendix A',
        content_draft: '# Appendix',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/manuscripts/book-id/chapters/back/appendix-a',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    it('returns WriteResult with contentHash', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            content_hash: 'new-hash',
            word_count: 10,
            created_at: '2026-01-01',
            parent_hash: 'abc123',
          },
          200,
          { ETag: '"new-hash"', 'X-Content-Hash': 'new-hash' },
        ),
      )

      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.saveChapter('book-id', 'body', 'ch-1', {
        title: 'Chapter 1',
        content_draft: '# Updated',
        expected_head: 'abc123',
      })

      expect(result.contentHash).toBe('new-hash')
      expect(result.response.content_hash).toBe('new-hash')
    })

    it('throws on 409 conflict', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Concurrent modification' }, 409))

      const client = new CosClient('http://localhost:8000', 'default')
      await expect(
        client.saveChapter('book-id', 'body', 'ch-1', {
          title: 'Ch 1',
          content_draft: 'x',
        }),
      ).rejects.toThrow()
    })

    it('throws ConcurrentModificationError on 409', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Concurrent modification' }, 409))

      const { ConcurrentModificationError } = await import('../../src/main/cos-client')
      const client = new CosClient('http://localhost:8000', 'default')
      await expect(
        client.saveChapter('book-id', 'body', 'ch-1', {
          title: 'Ch 1',
          content_draft: 'x',
        }),
      ).rejects.toBeInstanceOf(ConcurrentModificationError)
    })
  })

  describe('listBooks', () => {
    it('constructs correct URL for book list', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([{ id: 'book-1', title: 'Test Book' }]))
      const client = new CosClient('http://localhost:8000', 'default')
      await client.listBooks()
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/books',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Tenant-ID': 'default' }),
        }),
      )
    })

    it('returns array of books', async () => {
      const books = [
        { id: 'b1', title: 'Book 1' },
        { id: 'b2', title: 'Book 2' },
      ]
      mockFetch.mockResolvedValueOnce(mockResponse(books))
      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.listBooks()
      expect(result).toEqual(books)
    })
  })

  describe('getChapterAtHash', () => {
    it('constructs correct URL with hash', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Ch 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"abc123"', 'X-Content-Hash': 'abc123' },
        ),
      )
      const client = new CosClient('http://localhost:8000', 'default')
      await client.getChapterAtHash('book-id', 'body', 'ch-1', 'abc123')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/manuscripts/book-id/chapters/body/ch-1/at/abc123',
        expect.anything(),
      )
    })

    it('extracts content hash from headers', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          {
            slug: 'ch-1',
            title: 'Ch 1',
            content_draft: '# Hello',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          200,
          { ETag: '"hash456"', 'X-Content-Hash': 'hash456' },
        ),
      )
      const client = new CosClient('http://localhost:8000', 'default')
      const result = await client.getChapterAtHash('book-id', 'body', 'ch-1', 'hash456')
      expect(result.contentHash).toBe('hash456')
      expect(result.chapter.slug).toBe('ch-1')
    })
  })

  describe('error handling', () => {
    it('throws NotFoundError on 404', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Not found' }, 404))

      const { NotFoundError } = await import('../../src/main/cos-client')
      const client = new CosClient('http://localhost:8000', 'default')
      await expect(client.getChapter('book-id', 'body', 'missing')).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })

    it('throws on 404', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Not found' }, 404))

      const client = new CosClient('http://localhost:8000', 'default')
      await expect(client.getChapter('book-id', 'body', 'missing')).rejects.toThrow()
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const client = new CosClient('http://localhost:8000', 'default')
      await expect(client.getChapter('book-id', 'body', 'ch-1')).rejects.toThrow('Network error')
    })

    it('throws CosClientError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const { CosClientError } = await import('../../src/main/cos-client')
      const client = new CosClient('http://localhost:8000', 'default')
      await expect(client.getChapter('book-id', 'body', 'ch-1')).rejects.toBeInstanceOf(
        CosClientError,
      )
    })

    it('throws on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ detail: 'Internal server error' }, 500))

      const client = new CosClient('http://localhost:8000', 'default')
      await expect(client.getChapter('book-id', 'body', 'ch-1')).rejects.toThrow()
    })
  })
})
