const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs   = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

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

// ── Open database after sql.js WASM is loaded ─────────────────────────────────
async function openDatabase () {
  const Database = require('./database/db-wrapper')

  // Initialize sql.js WASM asynchronously — MUST be awaited once
  await Database.initialize()

  const tryOpen = () => {
    const instance = new Database(dbPath)
    require('./database/schema').initializeSchema(instance)
    instance.saveToDisk()
    return instance
  }

  try {
    const instance = tryOpen()
    console.log('[db] Ready:', dbPath)
    return instance
  } catch (err) {
    console.error('[db] Open failed:', err.message, '— starting fresh')

    // Back up corrupt file, then create a clean database
    if (fs.existsSync(dbPath)) {
      try {
        fs.renameSync(dbPath, dbPath.replace('.db', `_bad_${Date.now()}.db`))
      } catch (_) {}
    }
    ;[dbPath + '-wal', dbPath + '-shm'].forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (_) {}
    })

    const fresh = tryOpen()
    console.log('[db] Fresh database created')
    return fresh
  }
}

// ── Browser window ────────────────────────────────────────────────────────────
function createWindow () {
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
    icon: path.join(__dirname, '../public/logo02.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
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
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── App ready — fully async startup ──────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    // 1. Initialize sql.js WASM and open the database
    db = await openDatabase()

    // 2. Register all IPC handlers
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

    // 3. Create the window AFTER database is ready
    createWindow()

  } catch (err) {
    console.error('[main] Fatal startup error:', err)
    dialog.showErrorBox('Startup Error', String(err.message || err))
    app.quit()
  }
})

// Flush DB to disk before quitting
app.on('before-quit', () => {
  try { if (db) db.saveToDisk() } catch (_) {}
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
