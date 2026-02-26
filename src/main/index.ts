import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import icon from '../../resources/icon.png?asset'
import type {
  BufferApplyChangesRequest,
  BufferOpenRequest,
  NavLoadHistoryRequest,
  NavLoadVersionRequest,
  NavRestoreVersionRequest,
  Settings,
} from '../shared/ipc'
import { IPC } from '../shared/ipc'
import { BufferManager } from './buffer'
import { CosClient } from './cos-client'
import { SettingsStore } from './settings'

const HEALTH_CHECK_INTERVAL_MS = 10_000

let mainWindow: BrowserWindow | null = null
let cosClient: CosClient
let buffer: BufferManager
let settings: SettingsStore
let healthCheckTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function sendToRenderer(channel: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

async function checkCosConnection(): Promise<void> {
  const s = settings.get()
  try {
    const { ok, latencyMs } = await cosClient.healthCheck()
    sendToRenderer(IPC.COS_STATUS, {
      connected: ok,
      apiUrl: s.cosApiUrl,
      ...(ok ? {} : { error: `Health check failed (${latencyMs}ms)` }),
    })
  } catch (err) {
    sendToRenderer(IPC.COS_STATUS, {
      connected: false,
      apiUrl: s.cosApiUrl,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

function registerIpcHandlers(): void {
  // Buffer operations
  ipcMain.handle(IPC.BUFFER_OPEN, async (_event, req: BufferOpenRequest) => {
    return buffer.open(req.bookId, req.section, req.slug)
  })

  ipcMain.handle(IPC.BUFFER_APPLY_CHANGES, (_event, req: BufferApplyChangesRequest) => {
    return buffer.applyChanges(req.content)
  })

  ipcMain.handle(IPC.BUFFER_SAVE, async () => {
    return buffer.save()
  })

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return settings.get()
  })

  ipcMain.handle(IPC.SETTINGS_SET, (_event, partial: Partial<Settings>) => {
    const updated = settings.set(partial)
    // Update cos-client config when settings change
    cosClient.updateConfig(updated.cosApiUrl, updated.cosTenantId)
    return updated
  })

  ipcMain.handle(IPC.SETTINGS_TEST_CONNECTION, async () => {
    const start = performance.now()
    try {
      const { ok } = await cosClient.healthCheck()
      const latencyMs = Math.round(performance.now() - start)
      return {
        success: ok,
        message: ok ? `Connected (${latencyMs}ms)` : 'Health check failed',
        latencyMs,
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start)
      return {
        success: false,
        message: err instanceof Error ? err.message : String(err),
        latencyMs,
      }
    }
  })

  // Navigation operations
  ipcMain.handle(IPC.NAV_LIST_BOOKS, async () => {
    return cosClient.listBooks()
  })

  ipcMain.handle(IPC.NAV_LOAD_MANUSCRIPT, async (_event, bookId: string) => {
    return cosClient.getManuscript(bookId)
  })

  ipcMain.handle(IPC.NAV_LOAD_HISTORY, async (_event, req: NavLoadHistoryRequest) => {
    return cosClient.getChapterHistory(req.bookId, req.section, req.slug)
  })

  ipcMain.handle(IPC.NAV_LOAD_VERSION, async (_event, req: NavLoadVersionRequest) => {
    const { chapter } = await cosClient.getChapterAtHash(
      req.bookId,
      req.section,
      req.slug,
      req.hash,
    )
    return chapter
  })

  ipcMain.handle(IPC.NAV_RESTORE_VERSION, async (_event, req: NavRestoreVersionRequest) => {
    return cosClient.revertChapter(req.bookId, req.section, req.slug, {
      target_hash: req.targetHash,
      expected_head: req.expectedHead ?? undefined,
    })
  })
}

// --- App lifecycle ---

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cos-editor')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize settings
  settings = new SettingsStore()
  const s = settings.get()

  // Initialize COS client
  cosClient = new CosClient(s.cosApiUrl, s.cosTenantId)

  // Initialize buffer manager
  buffer = new BufferManager(cosClient)

  // Forward buffer state events to renderer
  buffer.on('state', (state) => {
    sendToRenderer(IPC.BUFFER_STATE, state)
  })

  // Register IPC handlers
  registerIpcHandlers()

  // Create the window
  createWindow()

  // Check COS connection on startup and poll periodically
  checkCosConnection()
  healthCheckTimer = setInterval(checkCosConnection, HEALTH_CHECK_INTERVAL_MS)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// macOS: keep app running when all windows closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (healthCheckTimer) clearInterval(healthCheckTimer)
  buffer?.destroy()
})
