const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = !app.isPackaged

// ── Data paths ────────────────────────────────────────────────────────────────
const userDataPath  = app.getPath('userData')
const dbPath        = path.join(userDataPath, 'goddest_metals.db')
const documentsPath = path.join(userDataPath, 'documents')
const backupPath    = path.join(userDataPath, 'backups')

;[documentsPath, backupPath].forEach(p => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

let mainWindow
let db

// ── Resolve paths that differ between dev and packaged ───────────────────────
function getAppPath(...parts) {
  if (isDev) {
    return path.join(__dirname, '..', ...parts)
  }
  // In packaged app, __dirname is inside resources/app/electron/
  // app.getAppPath() gives resources/app
  return path.join(app.getAppPath(), ...parts)
}

// ── Open database ─────────────────────────────────────────────────────────────
async function openDatabase() {
  const Database = require('./database/db-wrapper')
  await Database.initialize()

  const tryOpen = () => {
    const instance = new Database(dbPath)
    require('./database/schema').initializeSchema(instance)
    instance.saveToDisk()
    return instance
  }

  try {
    return tryOpen()
  } catch (err) {
    console.error('[db] Open failed:', err.message, '— starting fresh')
    if (fs.existsSync(dbPath)) {
      try { fs.renameSync(dbPath, dbPath.replace('.db', `_bad_${Date.now()}.db`)) } catch (_) {}
    }
    return tryOpen()
  }
}

// ── Browser window ────────────────────────────────────────────────────────────
function createWindow() {
  // Resolve icon path safely — don't crash if icon is missing
  let iconPath
  try {
    const candidate = getAppPath('public', 'logo02.png')
    iconPath = fs.existsSync(candidate) ? candidate : undefined
  } catch (_) {
    iconPath = undefined
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f1117',
      symbolColor: '#94a3b8',
      height: 38
    },
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    // In packaged app, index.html is in resources/app/dist/
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    console.log('[window] Loading:', indexPath)
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[window] loadFile failed:', err.message)
      dialog.showErrorBox('Load Error', `Could not load app UI:\n${indexPath}\n\n${err.message}`)
      app.quit()
    })
    // Open DevTools in packaged app if there's a crash — remove after stable
    mainWindow.webContents.on('did-fail-load', (event, code, desc, url) => {
      console.error('[window] did-fail-load:', code, desc, url)
      if (!mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.openDevTools()
      }
    })
  }
}

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    db = await openDatabase()
    console.log('[main] DB ready')

    require('./ipc/auth').registerHandlers(ipcMain, db)
    require('./ipc/customers').registerHandlers(ipcMain, db)
    require('./ipc/transactions').registerHandlers(ipcMain, db)
    require('./ipc/deliveries').registerHandlers(ipcMain, db)
    require('./ipc/employees').registerHandlers(ipcMain, db)
    require('./ipc/payments').registerHandlers(ipcMain, db)
    require('./ipc/documents').registerHandlers(ipcMain, db, documentsPath)
    require('./ipc/reports').registerHandlers(ipcMain, db)
    require('./ipc/backup').registerHandlers(ipcMain, db, dbPath, documentsPath, backupPath)
    require('./ipc/dashboard').registerHandlers(ipcMain, db)
    require('./ipc/accounts').registerHandlers(ipcMain, db)

    ipcMain.handle('app:get-paths',     () => ({ userDataPath, documentsPath, backupPath, dbPath }))
    ipcMain.handle('app:open-external', (_, url) => shell.openExternal(url))
    ipcMain.handle('shell:open-path',   (_, p)   => shell.openPath(p))
    ipcMain.handle('dialog:open-file',  async (_, opts) => dialog.showOpenDialog(mainWindow, opts))
    ipcMain.handle('dialog:save-file',  async (_, opts) => dialog.showSaveDialog(mainWindow, opts))

    console.log('[main] IPC handlers registered, creating window')
    createWindow()

  } catch (err) {
    console.error('[main] Fatal startup error:', err)
    dialog.showErrorBox('Startup Error', String(err.message || err))
    app.quit()
  }
})

app.on('before-quit', () => {
  try { if (db) db.saveToDisk() } catch (_) {}
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
