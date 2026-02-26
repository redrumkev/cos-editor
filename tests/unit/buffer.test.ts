import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the cos-client module — must provide both the class and error types
vi.mock('../../src/main/cos-client', () => {
  const mockClient = {
    getChapter: vi.fn(),
    saveChapter: vi.fn(),
    getManuscript: vi.fn(),
    getBook: vi.fn(),
  }
  return {
    CosClient: vi.fn(() => mockClient),
    CosClientError: class extends Error {},
    ConcurrentModificationError: class extends Error {},
    NotFoundError: class extends Error {},
    __mockClient: mockClient,
  }
})

describe('BufferManager', () => {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import for test setup
  let BufferManager: any
  // biome-ignore lint/suspicious/noExplicitAny: mock client for test setup
  let mockClient: any

  beforeEach(async () => {
    vi.clearAllMocks()

    const cosClientMod = await import('../../src/main/cos-client')
    // biome-ignore lint/suspicious/noExplicitAny: accessing test helper from mock
    mockClient = (cosClientMod as any).__mockClient

    const mod = await import('../../src/main/buffer')
    BufferManager = mod.BufferManager
  })

  describe('opening a buffer', () => {
    it('loads chapter content and sets headHash', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello World',
          content_published: null,
          word_count: 2,
          metadata: {},
        },
        contentHash: 'abc123',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open('book-1', 'body', 'ch-1')

      expect(mockClient.getChapter).toHaveBeenCalledWith('book-1', 'body', 'ch-1')
      expect(state.content).toBe('# Hello World')
      expect(state.headHash).toBe('abc123')
      expect(state.dirty).toBe(false)
    })

    it('single buffer constraint: opening new buffer replaces old one', async () => {
      mockClient.getChapter
        .mockResolvedValueOnce({
          chapter: {
            slug: 'ch-1',
            title: 'Chapter 1',
            content_draft: '# First',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          contentHash: 'hash-1',
        })
        .mockResolvedValueOnce({
          chapter: {
            slug: 'ch-2',
            title: 'Chapter 2',
            content_draft: '# Second',
            content_published: null,
            word_count: 1,
            metadata: {},
          },
          contentHash: 'hash-2',
        })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      const state = await buffer.open('book-1', 'body', 'ch-2')

      expect(state.slug).toBe('ch-2')
      expect(state.content).toBe('# Second')
      expect(state.headHash).toBe('hash-2')
    })

    it('uses content_published when content_draft is null', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: null,
          content_published: '# Published Content',
          word_count: 2,
          metadata: {},
        },
        contentHash: 'pub-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open('book-1', 'body', 'ch-1')

      expect(state.content).toBe('# Published Content')
    })

    it('uses empty string when both content fields are null', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: null,
          content_published: null,
          word_count: 0,
          metadata: {},
        },
        contentHash: 'empty-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open('book-1', 'body', 'ch-1')

      expect(state.content).toBe('')
    })
  })

  describe('applying changes', () => {
    it('marks buffer as dirty after changes', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      const state = buffer.applyChanges('# Hello Updated')

      expect(state.dirty).toBe(true)
      expect(state.content).toBe('# Hello Updated')
    })

    it('emits state event on changes', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')

      const stateHandler = vi.fn()
      buffer.on('state', stateHandler)
      buffer.applyChanges('# Updated')

      expect(stateHandler).toHaveBeenCalledTimes(1)
      expect(stateHandler.mock.calls[0][0].dirty).toBe(true)
    })
  })

  describe('saving', () => {
    it('calls cos-client with correct expected_head', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })
      mockClient.saveChapter.mockResolvedValueOnce({
        response: {
          content_hash: 'new-hash',
          word_count: 2,
          created_at: '2026-01-01',
          parent_hash: 'abc123',
        },
        contentHash: 'new-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      buffer.applyChanges('# Hello Updated')
      await buffer.save()

      expect(mockClient.saveChapter).toHaveBeenCalledWith(
        'book-1',
        'body',
        'ch-1',
        expect.objectContaining({
          expected_head: 'abc123',
        }),
      )
    })

    it('updates headHash and clears dirty after save', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })
      mockClient.saveChapter.mockResolvedValueOnce({
        response: {
          content_hash: 'new-hash',
          word_count: 2,
          created_at: '2026-01-01',
          parent_hash: 'abc123',
        },
        contentHash: 'new-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      buffer.applyChanges('# Hello Updated')
      const state = await buffer.save()

      expect(state.headHash).toBe('new-hash')
      expect(state.dirty).toBe(false)
    })

    it('throws when no buffer is open', async () => {
      const buffer = new BufferManager(mockClient)
      await expect(buffer.save()).rejects.toThrow('No buffer is open')
    })
  })

  describe('autosave debounce', () => {
    it('debounces rapid changes before triggering save', async () => {
      vi.useFakeTimers()

      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })
      mockClient.saveChapter.mockResolvedValue({
        response: {
          content_hash: 'final-hash',
          word_count: 3,
          created_at: '2026-01-01',
          parent_hash: 'abc123',
        },
        contentHash: 'final-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')

      // Rapid changes — should NOT trigger save immediately
      buffer.applyChanges('# Change 1')
      buffer.applyChanges('# Change 2')
      buffer.applyChanges('# Change 3')

      // No save yet
      expect(mockClient.saveChapter).not.toHaveBeenCalled()

      // Advance past the 3000ms autosave delay
      await vi.advanceTimersByTimeAsync(3500)

      // Now save should have been called once (not three times)
      expect(mockClient.saveChapter).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('resets debounce timer on each change', async () => {
      vi.useFakeTimers()

      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })
      mockClient.saveChapter.mockResolvedValue({
        response: {
          content_hash: 'final-hash',
          word_count: 3,
          created_at: '2026-01-01',
          parent_hash: 'abc123',
        },
        contentHash: 'final-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')

      buffer.applyChanges('# Change 1')
      await vi.advanceTimersByTimeAsync(2000)

      // Change again before 3000ms timer fires — resets debounce
      buffer.applyChanges('# Change 2')
      await vi.advanceTimersByTimeAsync(2000)

      // Still no save — timer was reset
      expect(mockClient.saveChapter).not.toHaveBeenCalled()

      // Now advance past the new debounce window
      await vi.advanceTimersByTimeAsync(1500)
      expect(mockClient.saveChapter).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('getState', () => {
    it('returns correct word count', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: 'one two three four five',
          content_published: null,
          word_count: 5,
          metadata: {},
        },
        contentHash: 'abc',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      const state = buffer.getState()

      expect(state.wordCount).toBe(5)
    })

    it('reports empty state before open', () => {
      const buffer = new BufferManager(mockClient)
      const state = buffer.getState()

      expect(state.bookId).toBe('')
      expect(state.dirty).toBe(false)
      expect(state.headHash).toBeNull()
    })
  })

  describe('destroy', () => {
    it('clears autosave timer and listeners', async () => {
      vi.useFakeTimers()

      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          slug: 'ch-1',
          title: 'Chapter 1',
          content_draft: '# Hello',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'abc123',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open('book-1', 'body', 'ch-1')
      buffer.applyChanges('# Changed')
      buffer.destroy()

      // Advance time — autosave should NOT fire
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockClient.saveChapter).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})
