const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Data directory setup
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'goddest_metals.db')
const documentsPath = path.join(userDataPath, 'documents')
const backupPath = path.join(userDataPath, 'backups')

;[documentsPath, backupPath].forEach(p => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

let mainWindow
let db

// ── Safe database initialiser ─────────────────────────────────────────────────
// If the DB is corrupt or schema is wrong, backs it up and creates a fresh one.
function openDatabase() {
  const Database = require('better-sqlite3')

  const tryOpen = () => {
    const instance = new Database(dbPath)
    instance.pragma('journal_mode = WAL')
    instance.pragma('foreign_keys = ON')
    // Quick sanity check — will throw if file is corrupt
    instance.prepare('SELECT 1').get()
    return instance
  }

  try {
    const instance = tryOpen()
    require('./database/schema').initializeSchema(instance)
    return instance
  } catch (err) {
    console.error('[db] Open/schema failed:', err.message)
    // Back up the bad DB and start fresh
    if (fs.existsSync(dbPath)) {
      const stamp = Date.now()
      const badPath = dbPath.replace('.db', `_bad_${stamp}.db`)
      try { fs.renameSync(dbPath, badPath) } catch (_) {}
      console.log('[db] Bad database backed up to', badPath)
    }
    // Also remove WAL/SHM files
    ;[dbPath + '-wal', dbPath + '-shm'].forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f) } catch (_) {}
    })
    // Try again with fresh file
    const fresh = new Database(dbPath)
    fresh.pragma('journal_mode = WAL')
    fresh.pragma('foreign_keys = ON')
    require('./database/schema').initializeSchema(fresh)
    console.log('[db] Fresh database created successfully')
    return fresh
  }
}

function createWindow() {
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
    // Only open DevTools if explicitly requested via env variable
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

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

    ipcMain.handle('app:get-paths', () => ({ userDataPath, documentsPath, backupPath, dbPath }))
    ipcMain.handle('app:open-external', (_, url) => shell.openExternal(url))
    ipcMain.handle('dialog:open-file', async (_, options) => {
      const result = await dialog.showOpenDialog(mainWindow, options)
      return result
    })
    ipcMain.handle('dialog:save-file', async (_, options) => {
      const result = await dialog.showSaveDialog(mainWindow, options)
      return result
    })
    ipcMain.handle('shell:open-path', (_, p) => shell.openPath(p))

    createWindow()
  } catch (err) {
    console.error('[main] Fatal startup error:', err)
    dialog.showErrorBox('Startup Error', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
