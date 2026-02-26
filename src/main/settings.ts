import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { Settings } from '../shared/ipc'

const SETTINGS_FILE = 'cos-editor-settings.json'

const DEFAULT_SETTINGS: Settings = {
  cosApiUrl: 'http://localhost:8000',
  cosTenantId: 'default',
}

export class SettingsStore {
  private filePath: string
  private data: Settings

  constructor() {
    this.filePath = join(app.getPath('userData'), SETTINGS_FILE)
    this.data = this.load()
  }

  private load(): Settings {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(raw) as Partial<Settings>
        return { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (err) {
      console.error('[settings] Failed to load settings, using defaults:', err)
    }
    return { ...DEFAULT_SETTINGS }
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[settings] Failed to persist settings:', err)
    }
  }

  get(): Settings {
    return { ...this.data }
  }

  set(partial: Partial<Settings>): Settings {
    this.data = { ...this.data, ...partial }
    this.persist()
    return this.get()
  }

  getPath(): string {
    return this.filePath
  }
}
