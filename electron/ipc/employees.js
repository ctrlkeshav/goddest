const bcrypt = require('bcryptjs')

function registerHandlers(ipcMain, db) {

  ipcMain.handle('employees:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT e.*,
        u.username as login_username, u.id as user_id,
        u.can_add_transaction, u.can_edit_record,
        COUNT(DISTINCT d.id) as delivery_count,
        COUNT(DISTINCT d.destination_city) as cities_visited
        FROM employees e
        LEFT JOIN users u ON e.user_id = u.id
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
      return { success: true, data: db.prepare(query).all(...params) }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:get-one', (_, id) => {
    try {
      const data = db.prepare(`SELECT e.*, u.username as login_username
        FROM employees e LEFT JOIN users u ON e.user_id = u.id
        WHERE e.id = ?`).get(id)
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

  // Assign login credentials to an employee (creates or updates linked user)
  ipcMain.handle('employees:assign-login', (_, { employeeId, username, password, can_add_transaction, can_edit_record }) => {
    try {
      const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId)
      if (!emp) return { success: false, error: 'Employee not found' }

      const hash = bcrypt.hashSync(password, 10)

      if (emp.user_id) {
        // Update existing linked user
        db.prepare(`UPDATE users SET username = ?, password_hash = ?,
          can_add_transaction = ?, can_edit_record = ?, is_active = 1 WHERE id = ?`)
          .run(username, hash, can_add_transaction ? 1 : 0, can_edit_record ? 1 : 0, emp.user_id)
        return { success: true, userId: emp.user_id }
      } else {
        // Create new user linked to this employee
        const result = db.prepare(`INSERT INTO users
          (username, password_hash, full_name, role, employee_id, can_add_transaction, can_edit_record)
          VALUES (?, ?, ?, 'staff', ?, ?, ?)`).run(
          username, hash, emp.employee_name, employeeId,
          can_add_transaction ? 1 : 0, can_edit_record ? 1 : 0
        )
        db.prepare('UPDATE employees SET user_id = ? WHERE id = ?')
          .run(result.lastInsertRowid, employeeId)
        return { success: true, userId: result.lastInsertRowid }
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Update just permissions for an employee's linked user
  ipcMain.handle('employees:update-permissions', (_, { employeeId, can_add_transaction, can_edit_record }) => {
    try {
      const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId)
      if (!emp?.user_id) return { success: false, error: 'No login account linked' }
      db.prepare(`UPDATE users SET can_add_transaction = ?, can_edit_record = ? WHERE id = ?`)
        .run(can_add_transaction ? 1 : 0, can_edit_record ? 1 : 0, emp.user_id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Remove login access from employee
  ipcMain.handle('employees:remove-login', (_, employeeId) => {
    try {
      const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId)
      if (!emp?.user_id) return { success: true } // nothing to remove
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(emp.user_id)
      db.prepare('UPDATE employees SET user_id = NULL WHERE id = ?').run(employeeId)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('employees:delete', (_, id) => {
    try {
      db.prepare(`UPDATE employees SET is_active = 0,
        updated_at = datetime('now','localtime') WHERE id = ?`).run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
