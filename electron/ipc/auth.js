const bcrypt = require('bcryptjs')

function logActivity(db, userId, username, action, module, recordId, details) {
  try {
    db.prepare(`INSERT INTO activity_log (user_id, username, action, module, record_id, details)
      VALUES (?, ?, ?, ?, ?, ?)`).run(userId, username, action, module, recordId, details)
  } catch (e) { /* silent */ }
}

function registerHandlers(ipcMain, db) {
  ipcMain.handle('auth:login', (_, { username, password }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username)
      if (!user) return { success: false, error: 'Invalid credentials' }
      const valid = bcrypt.compareSync(password, user.password_hash)
      if (!valid) return { success: false, error: 'Invalid credentials' }
      db.prepare('UPDATE users SET last_login = datetime("now","localtime") WHERE id = ?').run(user.id)
      logActivity(db, user.id, user.username, 'LOGIN', 'auth', String(user.id), 'User logged in')
      const { password_hash, ...safeUser } = user
      return { success: true, user: safeUser }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('auth:change-password', (_, { userId, oldPassword, newPassword }) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
      if (!user) return { success: false, error: 'User not found' }
      if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
        return { success: false, error: 'Current password is incorrect' }
      }
      const hash = bcrypt.hashSync(newPassword, 10)
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId)
      logActivity(db, userId, user.username, 'CHANGE_PASSWORD', 'auth', String(userId), 'Password changed')
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('auth:get-users', () => {
    const users = db.prepare('SELECT id, username, full_name, role, is_active, created_at, last_login FROM users').all()
    return { success: true, data: users }
  })

  ipcMain.handle('auth:create-user', (_, data) => {
    try {
      const hash = bcrypt.hashSync(data.password, 10)
      const result = db.prepare(`INSERT INTO users (username, password_hash, full_name, role)
        VALUES (?, ?, ?, ?)`).run(data.username, hash, data.full_name, data.role)
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('auth:update-user', (_, data) => {
    try {
      db.prepare(`UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = datetime('now','localtime')
        WHERE id = ?`).run(data.full_name, data.role, data.is_active, data.id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('auth:delete-user', (_, id) => {
    try {
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('auth:get-activity-log', (_, filters = {}) => {
    let query = `SELECT al.*, u.full_name FROM activity_log al
      LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`
    const params = []
    if (filters.userId) { query += ' AND al.user_id = ?'; params.push(filters.userId) }
    if (filters.module) { query += ' AND al.module = ?'; params.push(filters.module) }
    if (filters.from) { query += ' AND al.created_at >= ?'; params.push(filters.from) }
    if (filters.to) { query += ' AND al.created_at <= ?'; params.push(filters.to) }
    query += ' ORDER BY al.created_at DESC LIMIT 500'
    const data = db.prepare(query).all(...params)
    return { success: true, data }
  })
}

module.exports = { registerHandlers, logActivity }
