import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app, screen } from 'electron'

const WINDOW_STATE_FILE = 'window-state.json'

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
}

export class WindowStateStore {
  private filePath: string
  private data: WindowState

  constructor() {
    this.filePath = join(app.getPath('userData'), WINDOW_STATE_FILE)
    this.data = this.load()
  }

  private load(): WindowState {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(raw) as Partial<WindowState>
        const state = { ...DEFAULT_STATE, ...parsed }
        return this.validateBounds(state)
      }
    } catch (err) {
      console.error('[window-state] Failed to load window state, using defaults:', err)
    }
    return { ...DEFAULT_STATE }
  }

  private validateBounds(state: WindowState): WindowState {
    if (state.x === undefined || state.y === undefined) {
      return state
    }

    const sx = state.x
    const sy = state.y

    const displays = screen.getAllDisplays()
    const visible = displays.some((display) => {
      const { x, y, width, height } = display.bounds
      // Check if at least a portion of the window is on this display
      return sx < x + width && sx + state.width > x && sy < y + height && sy + state.height > y
    })

    if (!visible) {
      console.warn('[window-state] Saved position is off-screen, falling back to defaults')
      return { ...DEFAULT_STATE }
    }

    return state
  }

  private persist(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[window-state] Failed to persist window state:', err)
    }
  }

  get(): WindowState {
    return { ...this.data }
  }

  set(partial: Partial<WindowState>): WindowState {
    this.data = { ...this.data, ...partial }
    this.persist()
    return this.get()
  }

  getPath(): string {
    return this.filePath
  }
}
