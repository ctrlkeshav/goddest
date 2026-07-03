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

// ── Open database ─────────────────────────────────────────────────────────────
function openDatabase () {
  // Pure-JS SQLite wrapper — no native compilation, no version mismatch
  const Database = require('./database/db-wrapper')

  try {
    const instance = new Database(dbPath)
    require('./database/schema').initializeSchema(instance)
    // Save to disk right after schema init so the file is always up to date
    instance.saveToDisk()
    console.log('[db] Database ready:', dbPath)
    return instance
  } catch (err) {
    console.error('[db] Open/schema failed:', err.message)

    // Back up bad file and start fresh
    if (fs.existsSync(dbPath)) {
      const badPath = dbPath.replace('.db', `_bad_${Date.now()}.db`)
      try { fs.renameSync(dbPath, badPath) } catch (_) {}
      console.log('[db] Bad database moved to', badPath)
    }
    ;[dbPath + '-wal', dbPath + '-shm'].forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (_) {}
    })

    const Database2 = require('./database/db-wrapper')
    const fresh = new Database2(dbPath)
    require('./database/schema').initializeSchema(fresh)
    fresh.saveToDisk()
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

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  try {
    db = openDatabase()

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

    ipcMain.handle('app:get-paths',     () => ({ userDataPath, documentsPath, backupPath, dbPath }))
    ipcMain.handle('app:open-external', (_, url) => shell.openExternal(url))
    ipcMain.handle('shell:open-path',   (_, p)   => shell.openPath(p))
    ipcMain.handle('dialog:open-file',  async (_, opts) => dialog.showOpenDialog(mainWindow, opts))
    ipcMain.handle('dialog:save-file',  async (_, opts) => dialog.showSaveDialog(mainWindow, opts))

    createWindow()
  } catch (err) {
    console.error('[main] Fatal startup error:', err)
    dialog.showErrorBox('Startup Error', err.message)
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
