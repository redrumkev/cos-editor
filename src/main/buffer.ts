import { EventEmitter } from 'node:events'
import type { SectionType } from '../shared/cos-types'
import type { BufferConflict, BufferMode, BufferState } from '../shared/ipc'
import type { CosClient } from './cos-client'
import { ConcurrentModificationError } from './cos-client'

const AUTOSAVE_DELAY_MS = 3000

function countWords(text: string): number {
  const trimmed = text.trim()
  if (trimmed.length === 0) return 0
  return trimmed.split(/\s+/).length
}

export class BufferManager extends EventEmitter {
  private client: CosClient

  // Current buffer state
  private bookId: string | null = null
  private chapterId: string | null = null
  private section: SectionType | null = null
  private slug: string | null = null
  private title: string | null = null
  private content = ''
  private dirty = false
  private headHash: string | null = null
  private liveHeadHash: string | null = null
  private lastSavedAt: string | null = null
  private mode: BufferMode = 'live'

  // Autosave timer
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null
  private saving = false

  constructor(client: CosClient) {
    super()
    this.client = client
  }

  async open(
    bookId: string,
    chapterId: string,
    section: SectionType,
    slug: string,
    mode: BufferMode = 'live',
  ): Promise<BufferState> {
    // Clear any existing autosave
    this.clearAutosave()

    // If we have unsaved changes, try to save first
    if (this.dirty && this.bookId && this.section && this.slug) {
      try {
        await this.save()
      } catch (err) {
        console.warn('[buffer] Failed to save before opening new buffer:', err)
      }
    }

    this.mode = mode

    if (mode === 'sandbox') {
      const { chapter, contentHash } = await this.client.getSandboxChapter(bookId, chapterId)
      this.content = chapter.sandbox_content ?? ''
      this.title = chapter.title
      this.headHash = contentHash || null

      // Fetch live head separately so sandbox accept can guard against concurrent live edits.
      try {
        const { contentHash: liveHash } = await this.client.getChapter(bookId, chapterId)
        this.liveHeadHash = liveHash || null
      } catch {
        this.liveHeadHash = null
      }
    } else {
      // Live mode: existing flow
      const { chapter, contentHash } = await this.client.getChapter(bookId, chapterId)
      this.content = chapter.content_draft ?? chapter.content_published ?? ''
      this.title = chapter.title
      this.headHash = contentHash || null
      this.liveHeadHash = contentHash || null
    }

    this.bookId = bookId
    this.chapterId = chapterId
    this.section = section
    this.slug = slug
    this.dirty = false
    this.lastSavedAt = null

    const state = this.getState()
    this.emit('state', state)
    return state
  }

  applyChanges(content: string): BufferState {
    this.content = content
    this.dirty = true
    this.resetAutosave()

    const state = this.getState()
    this.emit('state', state)
    return state
  }

  async save(): Promise<BufferState> {
    if (!this.bookId || !this.chapterId || !this.section || !this.slug) {
      throw new Error('No buffer is open')
    }

    if (this.saving) {
      // Already saving, return current state
      return this.getState()
    }

    this.saving = true
    this.clearAutosave()

    try {
      const saveBody = {
        title: this.title ?? this.slug,
        sandbox_content: this.content,
        expected_head: this.headHash,
      }

      let contentHash: string
      if (this.mode === 'sandbox') {
        const result = await this.client.saveSandboxChapter(this.bookId, this.chapterId, saveBody)
        contentHash = result.contentHash
      } else {
        const result = await this.client.saveChapter(this.bookId, this.chapterId, saveBody)
        contentHash = result.contentHash
      }

      this.headHash = contentHash
      if (this.mode === 'live') {
        this.liveHeadHash = contentHash
      }
      this.dirty = false
      this.lastSavedAt = new Date().toISOString()

      const state = this.getState()
      this.emit('state', state)
      return state
    } catch (err) {
      if (err instanceof ConcurrentModificationError) {
        const conflict: BufferConflict = {
          operation: 'save',
          mode: this.mode,
          message: err.message,
        }
        this.emit('conflict', conflict)
        // Suppress further autosave until conflict is resolved
        this.clearAutosave()
        return this.getState()
      }
      throw err
    } finally {
      this.saving = false
    }
  }

  async reloadFromServer(): Promise<BufferState> {
    if (!this.bookId || !this.chapterId || !this.section || !this.slug) {
      throw new Error('No buffer is open')
    }

    this.clearAutosave()

    if (this.mode === 'sandbox') {
      const { chapter, contentHash } = await this.client.getSandboxChapter(
        this.bookId,
        this.chapterId,
      )
      this.content = chapter.sandbox_content ?? ''
      this.title = chapter.title
      this.headHash = contentHash || null

      // Refresh live head for sandbox accept conflict checks.
      try {
        const { contentHash: liveHash } = await this.client.getChapter(this.bookId, this.chapterId)
        this.liveHeadHash = liveHash || null
      } catch {
        this.liveHeadHash = null
      }
    } else {
      const { chapter, contentHash } = await this.client.getChapter(this.bookId, this.chapterId)
      this.content = chapter.content_draft ?? chapter.content_published ?? ''
      this.title = chapter.title
      this.headHash = contentHash || null
      this.liveHeadHash = contentHash || null
    }

    this.dirty = false
    this.lastSavedAt = null

    const state = this.getState()
    this.emit('state', state)
    return state
  }

  async forceSave(): Promise<BufferState> {
    if (!this.bookId || !this.chapterId || !this.section || !this.slug) {
      throw new Error('No buffer is open')
    }

    // Fetch latest head hash without overwriting content
    if (this.mode === 'sandbox') {
      const { contentHash } = await this.client.getSandboxChapter(this.bookId, this.chapterId)
      this.headHash = contentHash || null
    } else {
      const { contentHash } = await this.client.getChapter(this.bookId, this.chapterId)
      this.headHash = contentHash || null
      this.liveHeadHash = contentHash || null
    }

    return this.save()
  }

  async acceptSandbox(actor = 'user'): Promise<BufferState> {
    if (!this.bookId || !this.chapterId || !this.section || !this.slug) {
      throw new Error('No buffer is open')
    }
    if (this.mode !== 'sandbox') {
      throw new Error('Cannot accept sandbox: not in sandbox mode')
    }
    if (this.headHash === null) {
      throw new Error('Cannot accept sandbox: no sandbox head hash')
    }

    try {
      const { contentHash } = await this.client.acceptSandbox(this.bookId, this.chapterId, {
        expected_sandbox_head: this.headHash,
        expected_live_head: this.liveHeadHash,
        actor,
      })

      // Flip to live mode
      this.mode = 'live'
      this.headHash = contentHash
      this.liveHeadHash = contentHash
      this.dirty = false
      this.lastSavedAt = new Date().toISOString()

      const state = this.getState()
      this.emit('state', state)
      return state
    } catch (err) {
      if (err instanceof ConcurrentModificationError) {
        const conflict: BufferConflict = {
          operation: 'accept',
          mode: this.mode,
          message: err.message,
        }
        this.emit('conflict', conflict)
        return this.getState()
      }
      throw err
    }
  }

  getState(): BufferState {
    return {
      bookId: this.bookId ?? '',
      chapterId: this.chapterId ?? '',
      section: this.section ?? '',
      slug: this.slug ?? '',
      content: this.content,
      dirty: this.dirty,
      headHash: this.headHash,
      lastSavedAt: this.lastSavedAt,
      wordCount: countWords(this.content),
      mode: this.mode,
      liveHeadHash: this.liveHeadHash,
    }
  }

  isOpen(): boolean {
    return this.bookId !== null
  }

  private resetAutosave(): void {
    this.clearAutosave()
    this.autosaveTimer = setTimeout(() => {
      this.save().catch((err) => {
        console.error('[buffer] Autosave failed:', err)
      })
    }, AUTOSAVE_DELAY_MS)
  }

  private clearAutosave(): void {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer)
      this.autosaveTimer = null
    }
  }

  destroy(): void {
    this.clearAutosave()
    this.removeAllListeners()
  }
}
