import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import icon from '../../resources/icon.png?asset'
import type {
  CaptureCreateRequest,
  CaptureListRequest,
  CaptureSnapshotRequest,
} from '../shared/cos-types'
import type {
  AppCommand,
  BufferAcceptDraftRequest,
  BufferApplyChangesRequest,
  BufferConflict,
  BufferOpenRequest,
  NavLoadHistoryRequest,
  NavLoadVersionRequest,
  NavRestoreVersionRequest,
  Settings,
} from '../shared/ipc'
import { IPC } from '../shared/ipc'
import { BufferManager } from './buffer'
import { CaptureManager } from './capture-manager'
import { CosClient } from './cos-client'
import { SettingsStore } from './settings'

const HEALTH_CHECK_INTERVAL_MS = 10_000

let mainWindow: BrowserWindow | null = null
let cosClient: CosClient
let buffer: BufferManager
let captureManager: CaptureManager
let settings: SettingsStore
let healthCheckTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
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

function sendCommand(cmd: AppCommand): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.APP_COMMAND, cmd)
  }
}

function buildAppMenu(): Electron.Menu {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Settings',
                accelerator: 'Cmd+,' as const,
                click: () => sendCommand({ type: 'toggle-settings' }),
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ] as Electron.MenuItemConstructorOptions[],
          },
        ]
      : []),

    // File
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            try {
              buffer?.save()
            } catch {
              // no-op
            }
          },
        },
        {
          label: 'Force Save',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            try {
              buffer?.forceSave()
            } catch {
              // no-op
            }
          },
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },

    // Edit
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },

    // View
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendCommand({ type: 'open-command-palette' }),
        },
        { type: 'separator' },
        {
          label: 'Toggle Left Pane',
          accelerator: 'CmdOrCtrl+B',
          click: () => sendCommand({ type: 'toggle-left-pane' }),
        },
        {
          label: 'Toggle Capture Panel',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => sendCommand({ type: 'toggle-capture-pane' }),
        },
        { type: 'separator' },
        {
          label: 'Toggle Live/Draft',
          accelerator: 'CmdOrCtrl+D',
          click: () => sendCommand({ type: 'toggle-buffer-mode' }),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
      ],
    },

    // Window
    { role: 'windowMenu' },

    // Help
    {
      label: 'Help',
      submenu: [],
    },
  ]

  return Menu.buildFromTemplate(template)
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
    return buffer.open(req.bookId, req.section, req.slug, req.mode ?? 'live')
  })

  ipcMain.handle(IPC.BUFFER_APPLY_CHANGES, (_event, req: BufferApplyChangesRequest) => {
    return buffer.applyChanges(req.content)
  })

  ipcMain.handle(IPC.BUFFER_SAVE, async () => {
    return buffer.save()
  })

  ipcMain.handle(IPC.BUFFER_RELOAD, async () => {
    return buffer.reloadFromServer()
  })

  ipcMain.handle(IPC.BUFFER_FORCE_SAVE, async () => {
    return buffer.forceSave()
  })

  ipcMain.handle(IPC.BUFFER_ACCEPT_DRAFT, async (_event, req: BufferAcceptDraftRequest) => {
    return buffer.acceptDraft(req.actor ?? 'user')
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
    if (req.mode === 'draft') {
      return cosClient.getDraftChapterHistory(req.bookId, req.section, req.slug)
    }
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

  // Capture operations
  ipcMain.handle(IPC.CAPTURE_CREATE_TODO, async (_event, req: CaptureCreateRequest) => {
    return captureManager.createTodo(req)
  })

  ipcMain.handle(IPC.CAPTURE_LIST_TODOS, async (_event, _req?: CaptureListRequest) => {
    return captureManager.listTodos()
  })

  ipcMain.handle(IPC.CAPTURE_GET_SNAPSHOT, async (_event, req: CaptureSnapshotRequest) => {
    return cosClient.getCaptureTodoSnapshot(req.todoId)
  })

  ipcMain.handle(IPC.CAPTURE_START_POLLING, async (_event, todoId: string) => {
    captureManager.startPolling(todoId)
  })

  ipcMain.handle(IPC.CAPTURE_STOP_POLLING, async () => {
    captureManager.stopPolling()
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

  // Forward buffer conflict events to renderer
  buffer.on('conflict', (conflict: BufferConflict) => {
    sendToRenderer(IPC.BUFFER_CONFLICT, conflict)
  })

  // Initialize capture manager
  captureManager = new CaptureManager(cosClient)

  // Forward capture state events to renderer
  captureManager.on('state', (state) => {
    sendToRenderer(IPC.CAPTURE_STATE, state)
  })

  // Register IPC handlers
  registerIpcHandlers()

  // Create the window
  createWindow()

  // Set native application menu
  Menu.setApplicationMenu(buildAppMenu())

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
  captureManager?.destroy()
})
