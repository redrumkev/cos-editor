import { EventEmitter } from 'node:events'
import type { SectionType } from '../shared/cos-types'
import type { BufferState } from '../shared/ipc'
import type { CosClient } from './cos-client'

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
  private section: SectionType | null = null
  private slug: string | null = null
  private content = ''
  private dirty = false
  private headHash: string | null = null
  private lastSavedAt: string | null = null

  // Autosave timer
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null
  private saving = false

  constructor(client: CosClient) {
    super()
    this.client = client
  }

  async open(bookId: string, section: SectionType, slug: string): Promise<BufferState> {
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

    // Load the chapter
    const { chapter, contentHash } = await this.client.getChapter(bookId, section, slug)

    this.bookId = bookId
    this.section = section
    this.slug = slug
    this.content = chapter.content_draft ?? chapter.content_published ?? ''
    this.dirty = false
    this.headHash = contentHash || null
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
    if (!this.bookId || !this.section || !this.slug) {
      throw new Error('No buffer is open')
    }

    if (this.saving) {
      // Already saving, return current state
      return this.getState()
    }

    this.saving = true
    this.clearAutosave()

    try {
      const { contentHash } = await this.client.saveChapter(this.bookId, this.section, this.slug, {
        title: this.slug, // Use slug as title for now
        content_draft: this.content,
        expected_head: this.headHash,
      })

      this.headHash = contentHash
      this.dirty = false
      this.lastSavedAt = new Date().toISOString()

      const state = this.getState()
      this.emit('state', state)
      return state
    } finally {
      this.saving = false
    }
  }

  getState(): BufferState {
    return {
      bookId: this.bookId ?? '',
      section: this.section ?? '',
      slug: this.slug ?? '',
      content: this.content,
      dirty: this.dirty,
      headHash: this.headHash,
      lastSavedAt: this.lastSavedAt,
      wordCount: countWords(this.content),
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
