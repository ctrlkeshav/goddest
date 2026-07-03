function registerHandlers(ipcMain, db) {
  ipcMain.handle('deliveries:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT d.*, c.customer_name, c.business_name,
        e.employee_name
        FROM deliveries d
        LEFT JOIN customers c ON d.customer_id = c.id
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE 1=1`
      const params = []
      if (filters.customerId) { query += ' AND d.customer_id = ?'; params.push(filters.customerId) }
      if (filters.employeeId) { query += ' AND d.employee_id = ?'; params.push(filters.employeeId) }
      if (filters.city) { query += ' AND d.destination_city LIKE ?'; params.push(`%${filters.city}%`) }
      if (filters.from) { query += ' AND d.delivery_date >= ?'; params.push(filters.from) }
      if (filters.to) { query += ' AND d.delivery_date <= ?'; params.push(filters.to) }
      if (filters.search) {
        query += ' AND (c.customer_name LIKE ? OR e.employee_name LIKE ? OR d.destination_city LIKE ? OR d.purpose LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s, s, s)
      }
      query += ' ORDER BY d.delivery_date DESC, d.created_at DESC'
      if (filters.limit) query += ` LIMIT ${parseInt(filters.limit)}`
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('deliveries:get-one', (_, id) => {
    try {
      const data = db.prepare(`SELECT d.*, c.customer_name, e.employee_name
        FROM deliveries d
        LEFT JOIN customers c ON d.customer_id = c.id
        LEFT JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?`).get(id)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('deliveries:create', (_, data) => {
    try {
      const result = db.prepare(`INSERT INTO deliveries
        (delivery_date, destination_city, destination_state, customer_id, employee_id,
        vehicle_details, purpose, silver_weight_delivered, fine_silver_collected,
        travel_expenses, notes, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        data.delivery_date, data.destination_city, data.destination_state,
        data.customer_id || null, data.employee_id || null, data.vehicle_details,
        data.purpose, data.silver_weight_delivered || 0, data.fine_silver_collected || 0,
        data.travel_expenses || 0, data.notes, data.created_by || null
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('deliveries:update', (_, data) => {
    try {
      db.prepare(`UPDATE deliveries SET
        delivery_date=?, destination_city=?, destination_state=?, customer_id=?,
        employee_id=?, vehicle_details=?, purpose=?, silver_weight_delivered=?,
        fine_silver_collected=?, travel_expenses=?, notes=?,
        updated_at=datetime('now','localtime') WHERE id=?`).run(
        data.delivery_date, data.destination_city, data.destination_state,
        data.customer_id || null, data.employee_id || null, data.vehicle_details,
        data.purpose, data.silver_weight_delivered || 0, data.fine_silver_collected || 0,
        data.travel_expenses || 0, data.notes, data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('deliveries:delete', (_, id) => {
    try {
      db.prepare('DELETE FROM deliveries WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
