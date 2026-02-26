import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { LayoutState } from '../shared/ipc'

const LAYOUT_FILE = 'cos-editor-layout.json'

const DEFAULT_LAYOUT: LayoutState = {
  leftPaneOpen: true,
  captureOpen: false,
  activeTab: 'structure',
  lastBookId: null,
  lastChapterPath: null,
}

export class LayoutStore {
  private filePath: string
  private data: LayoutState

  constructor() {
    this.filePath = join(app.getPath('userData'), LAYOUT_FILE)
    this.data = this.load()
  }

  private load(): LayoutState {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(raw) as Partial<LayoutState>
        return { ...DEFAULT_LAYOUT, ...parsed }
      }
    } catch (err) {
      console.error('[layout] Failed to load layout, using defaults:', err)
    }
    return { ...DEFAULT_LAYOUT }
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[layout] Failed to persist layout:', err)
    }
  }

  get(): LayoutState {
    return { ...this.data }
  }

  set(partial: Partial<LayoutState>): LayoutState {
    this.data = { ...this.data, ...partial }
    this.persist()
    return this.get()
  }

  getPath(): string {
    return this.filePath
  }
}
