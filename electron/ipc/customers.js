function registerHandlers(ipcMain, db) {
  ipcMain.handle('customers:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT c.*,
        COALESCE(SUM(CASE WHEN t.transaction_type='silver_issued' THEN t.gross_silver_given ELSE 0 END),0) as total_silver_issued,
        COALESCE(SUM(CASE WHEN t.transaction_type='fine_received' THEN t.fine_silver_received ELSE 0 END),0) as total_fine_received,
        COALESCE(SUM(CASE WHEN t.transaction_type='payment_received' THEN t.payment_amount ELSE 0 END),0) as total_payments,
        COALESCE(SUM(t.balance_fine_silver),0) as balance_fine
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE c.is_active = 1`
      const params = []
      if (filters.search) {
        query += ' AND (c.customer_name LIKE ? OR c.business_name LIKE ? OR c.mobile LIKE ? OR c.city LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s, s, s)
      }
      if (filters.city) { query += ' AND c.city = ?'; params.push(filters.city) }
      if (filters.state) { query += ' AND c.state = ?'; params.push(filters.state) }
      query += ' GROUP BY c.id ORDER BY c.customer_name'
      if (filters.limit) { query += ` LIMIT ${parseInt(filters.limit)}` }
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('customers:get-one', (_, id) => {
    try {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
      return { success: true, data: customer }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('customers:search', (_, q) => {
    try {
      const s = `%${q}%`
      const data = db.prepare(`SELECT id, customer_name, business_name, mobile, city
        FROM customers WHERE is_active = 1 AND
        (customer_name LIKE ? OR business_name LIKE ? OR mobile LIKE ?)
        ORDER BY customer_name LIMIT 20`).all(s, s, s)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('customers:create', (_, data) => {
    try {
      const result = db.prepare(`INSERT INTO customers
        (customer_name, business_name, mobile, address, gst_number, city, state, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        data.customer_name, data.business_name, data.mobile, data.address,
        data.gst_number, data.city, data.state, data.notes
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('customers:update', (_, data) => {
    try {
      db.prepare(`UPDATE customers SET
        customer_name=?, business_name=?, mobile=?, address=?, gst_number=?,
        city=?, state=?, notes=?, updated_at=datetime('now','localtime')
        WHERE id=?`).run(
        data.customer_name, data.business_name, data.mobile, data.address,
        data.gst_number, data.city, data.state, data.notes, data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('customers:delete', (_, id) => {
    try {
      db.prepare('UPDATE customers SET is_active = 0, updated_at = datetime("now","localtime") WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
