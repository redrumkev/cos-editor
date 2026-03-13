import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the cos-client module — must provide both the class and error types
vi.mock('../../src/main/cos-client', () => {
  class MockConcurrentModificationError extends Error {
    statusCode = 409
    constructor(message: string) {
      super(message)
      this.name = 'ConcurrentModificationError'
    }
  }
  class MockNotFoundError extends Error {
    statusCode = 404
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  }

  const mockClient = {
    getChapter: vi.fn(),
    saveChapter: vi.fn(),
    getSandboxChapter: vi.fn(),
    saveSandboxChapter: vi.fn(),
    acceptSandbox: vi.fn(),
    getManuscript: vi.fn(),
    getBook: vi.fn(),
  }
  return {
    CosClient: vi.fn(() => mockClient),
    CosClientError: class extends Error {},
    ConcurrentModificationError: MockConcurrentModificationError,
    NotFoundError: MockNotFoundError,
    __mockClient: mockClient,
  }
})

// Standard chapter response for reuse
const CHAPTER_RESPONSE = {
  chapter: {
    id: 'chapter-1',
    slug: 'ch-1',
    title: 'Chapter 1',
    chapter_kind: 'body',
    zone: 'body',
    status: 'draft',
    content_draft: '# Hello World',
    content_published: null,
    word_count: 2,
    metadata: {},
  },
  contentHash: 'abc123',
}

const BOOK_ID = 'book-1'
const CHAPTER_ID = 'chapter-1'
const CHAPTER_ID_2 = 'chapter-2'

const SAVE_RESPONSE = {
  response: {
    content_hash: 'new-hash',
    word_count: 2,
    created_at: '2026-01-01',
    parent_hash: 'abc123',
  },
  contentHash: 'new-hash',
}

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
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

      expect(mockClient.getChapter).toHaveBeenCalledWith(BOOK_ID, CHAPTER_ID)
      expect(state.content).toBe('# Hello World')
      expect(state.headHash).toBe('abc123')
      expect(state.dirty).toBe(false)
      expect(state.mode).toBe('live')
      expect(state.liveHeadHash).toBe('abc123')
    })

    it('single buffer constraint: opening new buffer replaces old one', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE).mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID_2,
          slug: 'ch-2',
          title: 'Chapter 2',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Second',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'hash-2',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      const state = await buffer.open(BOOK_ID, CHAPTER_ID_2, 'body', 'ch-2')

      expect(state.slug).toBe('ch-2')
      expect(state.content).toBe('# Second')
      expect(state.headHash).toBe('hash-2')
    })

    it('uses content_published when content_draft is null', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: null,
          content_published: '# Published Content',
          word_count: 2,
          metadata: {},
        },
        contentHash: 'pub-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

      expect(state.content).toBe('# Published Content')
    })

    it('uses empty string when both content fields are null', async () => {
      mockClient.getChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: null,
          content_published: null,
          word_count: 0,
          metadata: {},
        },
        contentHash: 'empty-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

      expect(state.content).toBe('')
    })
  })

  describe('opening in sandbox mode', () => {
    it('calls getSandboxChapter when mode is sandbox', async () => {
      mockClient.getSandboxChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Draft content',
          content_published: null,
          word_count: 2,
          metadata: {},
        },
        contentHash: 'draft-hash',
      })
      mockClient.getChapter.mockResolvedValueOnce({
        ...CHAPTER_RESPONSE,
        contentHash: 'live-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')

      expect(mockClient.getSandboxChapter).toHaveBeenCalledWith(BOOK_ID, CHAPTER_ID)
      expect(state.content).toBe('# Draft content')
      expect(state.headHash).toBe('draft-hash')
      expect(state.mode).toBe('sandbox')
      expect(state.liveHeadHash).toBe('live-hash')
    })

    it('falls back to getChapter when sandbox 404 (seed from live)', async () => {
      const { NotFoundError } = await import('../../src/main/cos-client')
      mockClient.getSandboxChapter.mockRejectedValueOnce(new NotFoundError('Not found'))
      // First getChapter call: seed fallback
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      // Second getChapter call: fetch live head
      mockClient.getChapter.mockResolvedValueOnce({
        ...CHAPTER_RESPONSE,
        contentHash: 'live-hash',
      })

      const buffer = new BufferManager(mockClient)
      const state = await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')

      expect(mockClient.getSandboxChapter).toHaveBeenCalled()
      expect(mockClient.getChapter).toHaveBeenCalled()
      expect(state.content).toBe('# Hello World')
      expect(state.headHash).toBeNull() // New sandbox stream, no head
      expect(state.mode).toBe('sandbox')
      expect(state.liveHeadHash).toBe('live-hash')
    })
  })

  describe('applying changes', () => {
    it('marks buffer as dirty after changes', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      const state = buffer.applyChanges('# Hello Updated')

      expect(state.dirty).toBe(true)
      expect(state.content).toBe('# Hello Updated')
    })

    it('emits state event on changes', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

      const stateHandler = vi.fn()
      buffer.on('state', stateHandler)
      buffer.applyChanges('# Updated')

      expect(stateHandler).toHaveBeenCalledTimes(1)
      expect(stateHandler.mock.calls[0][0].dirty).toBe(true)
    })
  })

  describe('saving', () => {
    it('calls cos-client with correct expected_head', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveChapter.mockResolvedValueOnce(SAVE_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      buffer.applyChanges('# Hello Updated')
      await buffer.save()

      expect(mockClient.saveChapter).toHaveBeenCalledWith(
        BOOK_ID,
        CHAPTER_ID,
        expect.objectContaining({
          expected_head: 'abc123',
        }),
      )
    })

    it('updates headHash and clears dirty after save', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveChapter.mockResolvedValueOnce(SAVE_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
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

  describe('saving in sandbox mode', () => {
    it('calls saveSandboxChapter with expected_head', async () => {
      mockClient.getSandboxChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Draft',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'draft-hash',
      })
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveSandboxChapter.mockResolvedValueOnce({
        response: {
          content_hash: 'new-draft-hash',
          word_count: 2,
          created_at: '2026-01-01',
          parent_hash: 'draft-hash',
        },
        contentHash: 'new-draft-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')
      buffer.applyChanges('# Draft Updated')
      const state = await buffer.save()

      expect(mockClient.saveSandboxChapter).toHaveBeenCalledWith(
        BOOK_ID,
        CHAPTER_ID,
        expect.objectContaining({
          expected_head: 'draft-hash',
          content_draft: '# Draft Updated',
        }),
      )
      expect(state.headHash).toBe('new-draft-hash')
      expect(state.dirty).toBe(false)
    })
  })

  describe('409 conflict on save', () => {
    it('emits conflict event on ConcurrentModificationError', async () => {
      const { ConcurrentModificationError } = await import('../../src/main/cos-client')
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveChapter.mockRejectedValueOnce(
        new ConcurrentModificationError('Concurrent modification'),
      )

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      buffer.applyChanges('# Conflict')

      const conflictHandler = vi.fn()
      buffer.on('conflict', conflictHandler)

      await buffer.save()

      expect(conflictHandler).toHaveBeenCalledTimes(1)
      expect(conflictHandler.mock.calls[0][0]).toEqual({
        operation: 'save',
        mode: 'live',
        message: 'Concurrent modification',
      })
    })
  })

  describe('acceptSandbox', () => {
    it('calls client.acceptSandbox and flips mode to live', async () => {
      mockClient.getSandboxChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Draft',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'draft-hash',
      })
      mockClient.getChapter.mockResolvedValueOnce({
        ...CHAPTER_RESPONSE,
        contentHash: 'live-hash',
      })
      mockClient.acceptSandbox.mockResolvedValueOnce({
        response: {
          content_hash: 'accepted-hash',
          word_count: 1,
          accepted_from_draft_hash: 'draft-hash',
        },
        contentHash: 'accepted-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')
      const state = await buffer.acceptSandbox('user')

      expect(mockClient.acceptSandbox).toHaveBeenCalledWith(BOOK_ID, CHAPTER_ID, {
        expected_draft_head: 'draft-hash',
        expected_live_head: 'live-hash',
        actor: 'user',
      })
      expect(state.mode).toBe('live')
      expect(state.headHash).toBe('accepted-hash')
      expect(state.liveHeadHash).toBe('accepted-hash')
    })

    it('throws when not in sandbox mode', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

      await expect(buffer.acceptSandbox('user')).rejects.toThrow('not in sandbox mode')
    })

    it('throws when no sandbox head hash', async () => {
      const { NotFoundError } = await import('../../src/main/cos-client')
      mockClient.getSandboxChapter.mockRejectedValueOnce(new NotFoundError('Not found'))
      mockClient.getChapter
        .mockResolvedValueOnce(CHAPTER_RESPONSE)
        .mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')

      // headHash is null for a new sandbox stream
      await expect(buffer.acceptSandbox('user')).rejects.toThrow('no sandbox head hash')
    })

    it('emits conflict on 409 during accept', async () => {
      const { ConcurrentModificationError } = await import('../../src/main/cos-client')
      mockClient.getSandboxChapter.mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Draft',
          content_published: null,
          word_count: 1,
          metadata: {},
        },
        contentHash: 'draft-hash',
      })
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.acceptSandbox.mockRejectedValueOnce(
        new ConcurrentModificationError('Accept conflict'),
      )

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1', 'sandbox')

      const conflictHandler = vi.fn()
      buffer.on('conflict', conflictHandler)

      await buffer.acceptSandbox('user')

      expect(conflictHandler).toHaveBeenCalledTimes(1)
      expect(conflictHandler.mock.calls[0][0].operation).toBe('accept')
    })
  })

  describe('reloadFromServer', () => {
    it('re-fetches and resets state', async () => {
      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE).mockResolvedValueOnce({
        chapter: {
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: '# Updated from server',
          content_published: null,
          word_count: 4,
          metadata: {},
        },
        contentHash: 'server-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      buffer.applyChanges('# Local changes')
      expect(buffer.getState().dirty).toBe(true)

      const state = await buffer.reloadFromServer()

      expect(state.content).toBe('# Updated from server')
      expect(state.headHash).toBe('server-hash')
      expect(state.dirty).toBe(false)
    })
  })

  describe('forceSave', () => {
    it('refreshes head hash then saves', async () => {
      mockClient.getChapter
        .mockResolvedValueOnce(CHAPTER_RESPONSE)
        // forceSave fetches latest head
        .mockResolvedValueOnce({
          ...CHAPTER_RESPONSE,
          contentHash: 'latest-hash',
        })
      mockClient.saveChapter.mockResolvedValueOnce({
        response: {
          content_hash: 'forced-hash',
          word_count: 2,
          created_at: '2026-01-01',
          parent_hash: 'latest-hash',
        },
        contentHash: 'forced-hash',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      buffer.applyChanges('# Force save content')

      const state = await buffer.forceSave()

      expect(state.headHash).toBe('forced-hash')
      expect(state.dirty).toBe(false)
      // Verify save was called with the refreshed head hash
      expect(mockClient.saveChapter).toHaveBeenCalledWith(
        BOOK_ID,
        CHAPTER_ID,
        expect.objectContaining({
          expected_head: 'latest-hash',
        }),
      )
    })
  })

  describe('autosave debounce', () => {
    it('debounces rapid changes before triggering save', async () => {
      vi.useFakeTimers()

      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveChapter.mockResolvedValue(SAVE_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

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

      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)
      mockClient.saveChapter.mockResolvedValue(SAVE_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')

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
          id: CHAPTER_ID,
          slug: 'ch-1',
          title: 'Chapter 1',
          chapter_kind: 'body',
          zone: 'body',
          status: 'draft',
          content_draft: 'one two three four five',
          content_published: null,
          word_count: 5,
          metadata: {},
        },
        contentHash: 'abc',
      })

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      const state = buffer.getState()

      expect(state.wordCount).toBe(5)
    })

    it('reports empty state before open', () => {
      const buffer = new BufferManager(mockClient)
      const state = buffer.getState()

      expect(state.bookId).toBe('')
      expect(state.dirty).toBe(false)
      expect(state.headHash).toBeNull()
      expect(state.mode).toBe('live')
      expect(state.liveHeadHash).toBeNull()
    })
  })

  describe('destroy', () => {
    it('clears autosave timer and listeners', async () => {
      vi.useFakeTimers()

      mockClient.getChapter.mockResolvedValueOnce(CHAPTER_RESPONSE)

      const buffer = new BufferManager(mockClient)
      await buffer.open(BOOK_ID, CHAPTER_ID, 'body', 'ch-1')
      buffer.applyChanges('# Changed')
      buffer.destroy()

      // Advance time — autosave should NOT fire
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockClient.saveChapter).not.toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})
