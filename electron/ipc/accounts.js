function registerHandlers(ipcMain, db) {

  ipcMain.handle('accounts:get-all', (_, filters = {}) => {
    try {
      let q = `SELECT * FROM general_accounts WHERE 1=1`
      const p = []
      if (filters.type)   { q += ' AND entry_type = ?';              p.push(filters.type) }
      if (filters.from)   { q += ' AND entry_date >= ?';             p.push(filters.from) }
      if (filters.to)     { q += ' AND entry_date <= ?';             p.push(filters.to) }
      if (filters.method) { q += ' AND payment_method = ?';          p.push(filters.method) }
      if (filters.search) {
        q += ' AND (party_name LIKE ? OR description LIKE ? OR category LIKE ? OR reference_number LIKE ?)'
        const s = `%${filters.search}%`
        p.push(s, s, s, s)
      }
      q += ' ORDER BY entry_date DESC, created_at DESC'
      if (filters.limit) q += ` LIMIT ${parseInt(filters.limit)}`
      return { success: true, data: db.prepare(q).all(...p) }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('accounts:get-one', (_, id) => {
    try {
      return { success: true, data: db.prepare('SELECT * FROM general_accounts WHERE id = ?').get(id) }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('accounts:create', (_, data) => {
    try {
      const result = db.prepare(`INSERT INTO general_accounts
        (entry_date, entry_type, category, party_name, amount, silver_weight, silver_rate,
         payment_method, reference_number, description, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        data.entry_date, data.entry_type, data.category || null,
        data.party_name || null, data.amount || 0,
        data.silver_weight || 0, data.silver_rate || 0,
        data.payment_method || null, data.reference_number || null,
        data.description || null, data.created_by || null
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('accounts:update', (_, data) => {
    try {
      db.prepare(`UPDATE general_accounts SET
        entry_date=?, entry_type=?, category=?, party_name=?, amount=?,
        silver_weight=?, silver_rate=?, payment_method=?,
        reference_number=?, description=?, updated_at=datetime('now','localtime')
        WHERE id=?`).run(
        data.entry_date, data.entry_type, data.category || null,
        data.party_name || null, data.amount || 0,
        data.silver_weight || 0, data.silver_rate || 0,
        data.payment_method || null, data.reference_number || null,
        data.description || null, data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('accounts:delete', (_, id) => {
    try {
      db.prepare('DELETE FROM general_accounts WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('accounts:get-summary', (_, filters = {}) => {
    try {
      let where = 'WHERE 1=1'
      const p = []
      if (filters.from) { where += ' AND entry_date >= ?'; p.push(filters.from) }
      if (filters.to)   { where += ' AND entry_date <= ?'; p.push(filters.to) }

      const summary = db.prepare(`SELECT
        COALESCE(SUM(CASE WHEN entry_type='income'           THEN amount ELSE 0 END),0) as total_income,
        COALESCE(SUM(CASE WHEN entry_type='expense'          THEN amount ELSE 0 END),0) as total_expense,
        COALESCE(SUM(CASE WHEN entry_type='silver_purchase'  THEN amount ELSE 0 END),0) as total_silver_purchase,
        COALESCE(SUM(CASE WHEN entry_type='silver_sale'      THEN amount ELSE 0 END),0) as total_silver_sale,
        COALESCE(SUM(CASE WHEN entry_type='bank_deposit'     THEN amount ELSE 0 END),0) as total_bank_deposit,
        COALESCE(SUM(CASE WHEN entry_type='bank_withdrawal'  THEN amount ELSE 0 END),0) as total_bank_withdrawal,
        COALESCE(SUM(CASE WHEN entry_type='silver_purchase'  THEN silver_weight ELSE 0 END),0) as total_silver_bought_g,
        COALESCE(SUM(CASE WHEN entry_type='silver_sale'      THEN silver_weight ELSE 0 END),0) as total_silver_sold_g
        FROM general_accounts ${where}`).get(...p)

      summary.net_cashflow = (summary.total_income + summary.total_silver_sale + summary.total_bank_withdrawal)
                           - (summary.total_expense + summary.total_silver_purchase + summary.total_bank_deposit)

      return { success: true, data: summary }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // Monthly breakdown for charts
  ipcMain.handle('accounts:get-monthly', (_, filters = {}) => {
    try {
      const data = db.prepare(`SELECT
        strftime('%Y-%m', entry_date) as month,
        COALESCE(SUM(CASE WHEN entry_type='income'          THEN amount ELSE 0 END),0) as income,
        COALESCE(SUM(CASE WHEN entry_type='expense'         THEN amount ELSE 0 END),0) as expense,
        COALESCE(SUM(CASE WHEN entry_type='silver_purchase' THEN amount ELSE 0 END),0) as silver_purchase,
        COALESCE(SUM(CASE WHEN entry_type='silver_sale'     THEN amount ELSE 0 END),0) as silver_sale
        FROM general_accounts
        WHERE entry_date >= date('now','-12 months')
        GROUP BY month ORDER BY month ASC`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
