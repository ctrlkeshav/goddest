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
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  const Database = require('better-sqlite3')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  require('./database/schema').initializeSchema(db)
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

  ipcMain.handle('app:get-paths', () => ({ userDataPath, documentsPath, backupPath }))
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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
