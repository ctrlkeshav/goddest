function registerHandlers(ipcMain, db) {
  ipcMain.handle('payments:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT p.*, c.customer_name, c.business_name
        FROM payments p JOIN customers c ON p.customer_id = c.id
        WHERE 1=1`
      const params = []
      if (filters.customerId) { query += ' AND p.customer_id = ?'; params.push(filters.customerId) }
      if (filters.method) { query += ' AND p.payment_method = ?'; params.push(filters.method) }
      if (filters.from) { query += ' AND p.payment_date >= ?'; params.push(filters.from) }
      if (filters.to) { query += ' AND p.payment_date <= ?'; params.push(filters.to) }
      if (filters.search) {
        query += ' AND (c.customer_name LIKE ? OR p.reference_number LIKE ? OR p.notes LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s, s)
      }
      query += ' ORDER BY p.payment_date DESC, p.created_at DESC'
      if (filters.limit) query += ` LIMIT ${parseInt(filters.limit)}`
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('payments:get-one', (_, id) => {
    try {
      const data = db.prepare(`SELECT p.*, c.customer_name
        FROM payments p JOIN customers c ON p.customer_id = c.id WHERE p.id = ?`).get(id)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('payments:create', (_, data) => {
    try {
      const result = db.prepare(`INSERT INTO payments
        (payment_date, customer_id, payment_amount, payment_method, reference_number, notes, created_by)
        VALUES (?,?,?,?,?,?,?)`).run(
        data.payment_date, data.customer_id, data.payment_amount,
        data.payment_method, data.reference_number, data.notes, data.created_by || null
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('payments:update', (_, data) => {
    try {
      db.prepare(`UPDATE payments SET
        payment_date=?, customer_id=?, payment_amount=?, payment_method=?,
        reference_number=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`).run(
        data.payment_date, data.customer_id, data.payment_amount,
        data.payment_method, data.reference_number, data.notes, data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('payments:delete', (_, id) => {
    try {
      db.prepare('DELETE FROM payments WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('payments:get-customer-summary', (_, customerId) => {
    try {
      const summary = db.prepare(`SELECT
        COALESCE(SUM(payment_amount),0) as total_paid,
        COUNT(*) as payment_count
        FROM payments WHERE customer_id = ?`).get(customerId)
      const history = db.prepare(`SELECT * FROM payments WHERE customer_id = ?
        ORDER BY payment_date DESC`).all(customerId)
      return { success: true, data: { summary, history } }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
