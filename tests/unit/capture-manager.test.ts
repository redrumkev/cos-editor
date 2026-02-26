import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureManager } from '../../src/main/capture-manager'
import type { CaptureItem, CaptureSnapshot } from '../../src/shared/cos-types'

// Mock CosClient
function createMockClient() {
  return {
    createCaptureTodo: vi.fn(),
    getCaptureTodo: vi.fn(),
    getCaptureTodoSnapshot: vi.fn(),
    listCaptureTodos: vi.fn(),
  }
}

const TODO_FIXTURE: CaptureItem = {
  id: 'todo-1',
  content: 'Rewrite opening',
  status: 'captured',
  priority: 'next',
  source_surface: 'book_editor',
  source_context: { book_id: 'b1', section: 'body', slug: 'ch-1' },
  tags: [],
  created_at: '2026-01-01',
}

const SNAPSHOT_FIXTURE: CaptureSnapshot = {
  todo: { ...TODO_FIXTURE, status: 'processing' },
  tasks: [
    {
      id: 'task-1',
      todo_id: 'todo-1',
      task_type: 'rewrite',
      status: 'running',
      instructions: 'Rewrite the opening',
      created_at: '2026-01-01',
    },
  ],
  results: [],
}

describe('CaptureManager', () => {
  let mockClient: ReturnType<typeof createMockClient>
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  let manager: CaptureManager

  beforeEach(() => {
    vi.useFakeTimers()
    mockClient = createMockClient()
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    manager = new CaptureManager(mockClient as any)
  })

  afterEach(() => {
    manager.destroy()
    vi.useRealTimers()
  })

  describe('createTodo', () => {
    it('calls client.createCaptureTodo and refreshes list', async () => {
      mockClient.createCaptureTodo.mockResolvedValue(TODO_FIXTURE)
      mockClient.listCaptureTodos.mockResolvedValue([TODO_FIXTURE])
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(SNAPSHOT_FIXTURE)

      const result = await manager.createTodo({
        content: 'Rewrite opening',
        bookId: 'b1',
        section: 'body',
        slug: 'ch-1',
      })

      expect(result.id).toBe('todo-1')
      expect(mockClient.createCaptureTodo).toHaveBeenCalledOnce()
      expect(mockClient.listCaptureTodos).toHaveBeenCalledWith({ active: true })
    })

    it('starts polling after creation', async () => {
      mockClient.createCaptureTodo.mockResolvedValue(TODO_FIXTURE)
      mockClient.listCaptureTodos.mockResolvedValue([TODO_FIXTURE])
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(SNAPSHOT_FIXTURE)

      await manager.createTodo({
        content: 'Rewrite opening',
        bookId: 'b1',
        section: 'body',
        slug: 'ch-1',
      })

      // Snapshot should have been fetched immediately (poll on start)
      expect(mockClient.getCaptureTodoSnapshot).toHaveBeenCalledWith('todo-1')
    })
  })

  describe('listTodos', () => {
    it('fetches active todos and emits state', async () => {
      mockClient.listCaptureTodos.mockResolvedValue([TODO_FIXTURE])
      const stateHandler = vi.fn()
      manager.on('state', stateHandler)

      const result = await manager.listTodos()

      expect(result).toEqual([TODO_FIXTURE])
      expect(stateHandler).toHaveBeenCalledWith(expect.objectContaining({ todos: [TODO_FIXTURE] }))
    })
  })

  describe('polling', () => {
    it('polls snapshot at interval', async () => {
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(SNAPSHOT_FIXTURE)

      manager.startPolling('todo-1')

      // Immediate poll
      await vi.advanceTimersByTimeAsync(0)
      expect(mockClient.getCaptureTodoSnapshot).toHaveBeenCalledTimes(1)

      // After interval
      await vi.advanceTimersByTimeAsync(3000)
      expect(mockClient.getCaptureTodoSnapshot).toHaveBeenCalledTimes(2)
    })

    it('stops polling on terminal state', async () => {
      const doneSnapshot: CaptureSnapshot = {
        todo: { ...TODO_FIXTURE, status: 'done' },
        tasks: [],
        results: [],
      }
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(doneSnapshot)

      manager.startPolling('todo-1')
      await vi.advanceTimersByTimeAsync(0)

      // Should have stopped — no more calls after interval
      mockClient.getCaptureTodoSnapshot.mockClear()
      await vi.advanceTimersByTimeAsync(3000)
      expect(mockClient.getCaptureTodoSnapshot).not.toHaveBeenCalled()
    })

    it('emits state only on change', async () => {
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(SNAPSHOT_FIXTURE)
      const stateHandler = vi.fn()
      manager.on('state', stateHandler)

      manager.startPolling('todo-1')
      await vi.advanceTimersByTimeAsync(0)
      expect(stateHandler).toHaveBeenCalledTimes(1)

      // Same snapshot — should not emit again
      await vi.advanceTimersByTimeAsync(3000)
      expect(stateHandler).toHaveBeenCalledTimes(1)
    })

    it('stopPolling clears timer', async () => {
      mockClient.getCaptureTodoSnapshot.mockResolvedValue(SNAPSHOT_FIXTURE)

      manager.startPolling('todo-1')
      await vi.advanceTimersByTimeAsync(0)

      manager.stopPolling()
      mockClient.getCaptureTodoSnapshot.mockClear()

      await vi.advanceTimersByTimeAsync(3000)
      expect(mockClient.getCaptureTodoSnapshot).not.toHaveBeenCalled()
    })
  })

  describe('getState', () => {
    it('returns current state', () => {
      const state = manager.getState()
      expect(state).toEqual({ todos: [] })
    })
  })

  describe('destroy', () => {
    it('stops polling and removes listeners', () => {
      manager.on('state', vi.fn())
      manager.destroy()
      expect(manager.listenerCount('state')).toBe(0)
    })
  })
})
