const path = require('path')
const fs = require('fs')
const { app } = require('electron')

function registerHandlers(ipcMain, db) {
  ipcMain.handle('reports:customer-ledger', (_, { customerId, from, to }) => {
    try {
      let query = `SELECT t.*, c.customer_name, c.business_name, c.mobile, c.city, c.gst_number
        FROM transactions t JOIN customers c ON t.customer_id = c.id
        WHERE t.customer_id = ?`
      const params = [customerId]
      if (from) { query += ' AND t.transaction_date >= ?'; params.push(from) }
      if (to) { query += ' AND t.transaction_date <= ?'; params.push(to) }
      query += ' ORDER BY t.transaction_date ASC, t.created_at ASC'
      const transactions = db.prepare(query).all(...params)
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId)
      let runningBalance = 0
      const ledger = transactions.map(t => {
        if (t.transaction_type === 'silver_issued') runningBalance += t.recoverable_fine_silver
        else if (t.transaction_type === 'fine_received') runningBalance -= t.fine_silver_received
        else if (t.transaction_type === 'adjustment') runningBalance += t.balance_fine_silver
        return { ...t, running_balance: runningBalance }
      })
      return { success: true, data: { customer, ledger } }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:silver-statement', (_, { from, to }) => {
    try {
      let query = `SELECT t.*, c.customer_name FROM transactions t
        JOIN customers c ON t.customer_id = c.id WHERE 1=1`
      const params = []
      if (from) { query += ' AND t.transaction_date >= ?'; params.push(from) }
      if (to) { query += ' AND t.transaction_date <= ?'; params.push(to) }
      query += ' ORDER BY t.transaction_date ASC'
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:delivery-report', (_, filters) => {
    try {
      let query = `SELECT d.*, c.customer_name, e.employee_name FROM deliveries d
        LEFT JOIN customers c ON d.customer_id = c.id
        LEFT JOIN employees e ON d.employee_id = e.id WHERE 1=1`
      const params = []
      if (filters.from) { query += ' AND d.delivery_date >= ?'; params.push(filters.from) }
      if (filters.to) { query += ' AND d.delivery_date <= ?'; params.push(filters.to) }
      if (filters.customerId) { query += ' AND d.customer_id = ?'; params.push(filters.customerId) }
      if (filters.employeeId) { query += ' AND d.employee_id = ?'; params.push(filters.employeeId) }
      query += ' ORDER BY d.delivery_date DESC'
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:pending-balance', () => {
    try {
      const data = db.prepare(`SELECT c.id, c.customer_name, c.business_name, c.mobile, c.city,
        COALESCE(SUM(CASE WHEN t.transaction_type='silver_issued' THEN t.recoverable_fine_silver ELSE 0 END),0) as total_recoverable,
        COALESCE(SUM(CASE WHEN t.transaction_type='fine_received' THEN t.fine_silver_received ELSE 0 END),0) as total_fine_received,
        COALESCE(SUM(CASE WHEN t.transaction_type='silver_issued' THEN t.gross_silver_given ELSE 0 END),0) as total_gross_issued
        FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE c.is_active = 1
        GROUP BY c.id ORDER BY c.customer_name`).all()
      const result = data.map(r => ({
        ...r,
        pending_fine: (r.total_recoverable || 0) - (r.total_fine_received || 0)
      }))
      return { success: true, data: result }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:payment-history', (_, filters) => {
    try {
      let query = `SELECT p.*, c.customer_name, c.business_name FROM payments p
        JOIN customers c ON p.customer_id = c.id WHERE 1=1`
      const params = []
      if (filters.from) { query += ' AND p.payment_date >= ?'; params.push(filters.from) }
      if (filters.to) { query += ' AND p.payment_date <= ?'; params.push(filters.to) }
      if (filters.customerId) { query += ' AND p.customer_id = ?'; params.push(filters.customerId) }
      if (filters.method) { query += ' AND p.payment_method = ?'; params.push(filters.method) }
      query += ' ORDER BY p.payment_date DESC'
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:export-excel', (_, { type, data, filename }) => {
    try {
      const XLSX = require('xlsx')
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, type)
      const savePath = path.join(app.getPath('downloads'), filename || `${type}_${Date.now()}.xlsx`)
      XLSX.writeFile(wb, savePath)
      return { success: true, path: savePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('reports:export-csv', (_, { data, filename }) => {
    try {
      const XLSX = require('xlsx')
      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const savePath = path.join(app.getPath('downloads'), filename || `export_${Date.now()}.csv`)
      fs.writeFileSync(savePath, csv)
      return { success: true, path: savePath }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
