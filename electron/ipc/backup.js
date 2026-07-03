const fs = require('fs')
const path = require('path')
const { app } = require('electron')

function registerHandlers(ipcMain, db, dbPath, documentsPath, backupPath) {
  ipcMain.handle('backup:create', async () => {
    try {
      const archiver = require('archiver')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const backupFile = path.join(backupPath, `goddest_backup_${timestamp}.zip`)

      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(backupFile)
        const archive = archiver('zip', { zlib: { level: 9 } })
        output.on('close', resolve)
        archive.on('error', reject)
        archive.pipe(output)

        // Checkpoint DB first
        db.pragma('wal_checkpoint(FULL)')
        archive.file(dbPath, { name: 'goddest_metals.db' })
        if (fs.existsSync(documentsPath)) {
          archive.directory(documentsPath, 'documents')
        }
        archive.finalize()
      })

      const stats = fs.statSync(backupFile)
      return { success: true, path: backupFile, size: stats.size }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('backup:restore', async (_, filePath) => {
    try {
      const extract = require('extract-zip')
      const userDataPath = app.getPath('userData')

      if (!fs.existsSync(filePath)) return { success: false, error: 'Backup file not found' }

      // Close DB before restore
      db.close()

      const tempRestore = path.join(userDataPath, '_restore_temp')
      if (fs.existsSync(tempRestore)) fs.rmSync(tempRestore, { recursive: true })
      fs.mkdirSync(tempRestore, { recursive: true })

      await extract(filePath, { dir: tempRestore })

      // Restore DB
      const restoredDb = path.join(tempRestore, 'goddest_metals.db')
      if (fs.existsSync(restoredDb)) {
        fs.copyFileSync(restoredDb, dbPath)
      }

      // Restore documents
      const restoredDocs = path.join(tempRestore, 'documents')
      if (fs.existsSync(restoredDocs)) {
        if (fs.existsSync(documentsPath)) fs.rmSync(documentsPath, { recursive: true })
        fs.mkdirSync(documentsPath, { recursive: true })
        const files = fs.readdirSync(restoredDocs)
        files.forEach(f => {
          fs.copyFileSync(path.join(restoredDocs, f), path.join(documentsPath, f))
        })
      }

      fs.rmSync(tempRestore, { recursive: true })
      return { success: true, message: 'Restore complete. Please restart the application.' }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('backup:list', () => {
    try {
      if (!fs.existsSync(backupPath)) return { success: true, data: [] }
      const files = fs.readdirSync(backupPath)
        .filter(f => f.endsWith('.zip'))
        .map(f => {
          const fullPath = path.join(backupPath, f)
          const stats = fs.statSync(fullPath)
          return { name: f, path: fullPath, size: stats.size, created: stats.birthtime }
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created))
      return { success: true, data: files }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
