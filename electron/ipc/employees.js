function registerHandlers(ipcMain, db) {
  ipcMain.handle('employees:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT e.*,
        COUNT(DISTINCT d.id) as delivery_count,
        COUNT(DISTINCT d.destination_city) as cities_visited
        FROM employees e
        LEFT JOIN deliveries d ON e.id = d.employee_id
        WHERE 1=1`
      const params = []
      if (filters.activeOnly) { query += ' AND e.is_active = 1' }
      if (filters.search) {
        query += ' AND (e.employee_name LIKE ? OR e.mobile LIKE ? OR e.designation LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s, s)
      }
      query += ' GROUP BY e.id ORDER BY e.employee_name'
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:get-one', (_, id) => {
    try {
      const data = db.prepare('SELECT * FROM employees WHERE id = ?').get(id)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:get-stats', (_, id) => {
    try {
      const stats = db.prepare(`SELECT
        COUNT(DISTINCT d.id) as total_deliveries,
        COUNT(DISTINCT d.destination_city) as cities_visited,
        COALESCE(SUM(d.silver_weight_delivered),0) as total_silver_delivered,
        COALESCE(SUM(d.fine_silver_collected),0) as total_fine_collected,
        COALESCE(SUM(d.travel_expenses),0) as total_expenses
        FROM deliveries d WHERE d.employee_id = ?`).get(id)
      const recentDeliveries = db.prepare(`SELECT d.*, c.customer_name
        FROM deliveries d LEFT JOIN customers c ON d.customer_id = c.id
        WHERE d.employee_id = ? ORDER BY d.delivery_date DESC LIMIT 10`).all(id)
      return { success: true, data: { stats, recent_deliveries: recentDeliveries } }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:create', (_, data) => {
    try {
      const result = db.prepare(`INSERT INTO employees
        (employee_name, mobile, designation, joining_date, is_active, notes)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        data.employee_name, data.mobile, data.designation,
        data.joining_date, data.is_active ?? 1, data.notes
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:update', (_, data) => {
    try {
      db.prepare(`UPDATE employees SET
        employee_name=?, mobile=?, designation=?, joining_date=?,
        is_active=?, notes=?, updated_at=datetime('now','localtime')
        WHERE id=?`).run(
        data.employee_name, data.mobile, data.designation,
        data.joining_date, data.is_active, data.notes, data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:delete', (_, id) => {
    try {
      db.prepare('UPDATE employees SET is_active = 0, updated_at = datetime("now","localtime") WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
