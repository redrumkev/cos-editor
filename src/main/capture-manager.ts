import { EventEmitter } from 'node:events'
import type { CaptureCreateRequest, CaptureItem, CaptureState } from '../shared/cos-types'
import type { CosClient } from './cos-client'

const POLL_INTERVAL_MS = 3000

export class CaptureManager extends EventEmitter {
  private client: CosClient
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pollingTodoId: string | null = null
  private state: CaptureState = { todos: [] }

  constructor(client: CosClient) {
    super()
    this.client = client
  }

  async createTodo(req: CaptureCreateRequest): Promise<CaptureItem> {
    const todo = await this.client.createCaptureTodo(req)
    // Refresh todo list and start polling for this todo
    await this.refreshTodos()
    this.startPolling(todo.id)
    return todo
  }

  async listTodos(): Promise<CaptureItem[]> {
    const todos = await this.client.listCaptureTodos({ active: true })
    this.state = { ...this.state, todos }
    this.emitState()
    return todos
  }

  startPolling(todoId: string): void {
    this.stopPolling()
    this.pollingTodoId = todoId
    this.pollTimer = setInterval(() => {
      this.pollSnapshot().catch((err) => {
        console.error('Capture poll error:', err)
      })
    }, POLL_INTERVAL_MS)
    // Poll immediately
    this.pollSnapshot().catch((err) => {
      console.error('Capture poll error:', err)
    })
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.pollingTodoId = null
  }

  getState(): CaptureState {
    return this.state
  }

  destroy(): void {
    this.stopPolling()
    this.removeAllListeners()
  }

  private async pollSnapshot(): Promise<void> {
    if (!this.pollingTodoId) return
    const snapshot = await this.client.getCaptureTodoSnapshot(this.pollingTodoId)
    const changed = JSON.stringify(this.state.activeSnapshot) !== JSON.stringify(snapshot)
    this.state = { ...this.state, activeSnapshot: snapshot }
    if (changed) {
      this.emitState()
    }
    // Stop polling if todo is in a terminal state
    if (
      snapshot.todo.status === 'ready_for_review' ||
      snapshot.todo.status === 'done' ||
      snapshot.todo.status === 'closed'
    ) {
      this.stopPolling()
      // Final emit to ensure UI has latest state
      this.emitState()
    }
  }

  private async refreshTodos(): Promise<void> {
    const todos = await this.client.listCaptureTodos({ active: true })
    this.state = { ...this.state, todos }
  }

  private emitState(): void {
    this.emit('state', this.state)
  }
}
