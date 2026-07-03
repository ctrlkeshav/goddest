const fs = require('fs')
const path = require('path')
const { shell } = require('electron')
const { v4: uuidv4 } = require('uuid')

function registerHandlers(ipcMain, db, documentsPath) {
  ipcMain.handle('documents:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT doc.*, c.customer_name, t.transaction_id as txn_ref
        FROM documents doc
        LEFT JOIN customers c ON doc.customer_id = c.id
        LEFT JOIN transactions t ON doc.transaction_id = t.id
        WHERE 1=1`
      const params = []
      if (filters.customerId) { query += ' AND doc.customer_id = ?'; params.push(filters.customerId) }
      if (filters.transactionId) { query += ' AND doc.transaction_id = ?'; params.push(filters.transactionId) }
      if (filters.category) { query += ' AND doc.document_category = ?'; params.push(filters.category) }
      if (filters.search) {
        query += ' AND (doc.document_name LIKE ? OR doc.original_filename LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s)
      }
      query += ' ORDER BY doc.created_at DESC'
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('documents:upload', (_, data) => {
    try {
      const srcPath = data.source_path
      if (!fs.existsSync(srcPath)) return { success: false, error: 'Source file not found' }

      const ext = path.extname(data.original_filename).toLowerCase()
      const storedName = `${uuidv4()}${ext}`
      const destPath = path.join(documentsPath, storedName)

      fs.copyFileSync(srcPath, destPath)
      const stats = fs.statSync(destPath)

      const result = db.prepare(`INSERT INTO documents
        (document_name, original_filename, stored_filename, file_type, file_size,
        document_category, customer_id, transaction_id, delivery_id, payment_id, notes, uploaded_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        data.document_name || data.original_filename,
        data.original_filename, storedName,
        ext.replace('.', '').toUpperCase(),
        stats.size, data.document_category,
        data.customer_id || null, data.transaction_id || null,
        data.delivery_id || null, data.payment_id || null,
        data.notes, data.uploaded_by || null
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('documents:open', (_, id) => {
    try {
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
      if (!doc) return { success: false, error: 'Document not found' }
      const filePath = path.join(documentsPath, doc.stored_filename)
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found on disk' }
      shell.openPath(filePath)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('documents:download', (_, id, destDir) => {
    try {
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
      if (!doc) return { success: false, error: 'Document not found' }
      const srcPath = path.join(documentsPath, doc.stored_filename)
      if (!fs.existsSync(srcPath)) return { success: false, error: 'File not found on disk' }
      const destPath = path.join(destDir, doc.original_filename)
      fs.copyFileSync(srcPath, destPath)
      return { success: true, path: destPath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('documents:delete', (_, id) => {
    try {
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
      if (!doc) return { success: false, error: 'Not found' }
      const filePath = path.join(documentsPath, doc.stored_filename)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      db.prepare('DELETE FROM documents WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
