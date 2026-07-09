const { v4: uuidv4 } = require('uuid')

function generateTransactionId() {
  const now = new Date()
  const yy  = String(now.getFullYear()).slice(2)
  const mm  = String(now.getMonth() + 1).padStart(2, '0')
  const dd  = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `TXN${yy}${mm}${dd}${rand}`
}

// Calculate the actual making charge amount from form data
function calcMakingCharges(data) {
  const rate   = parseFloat(data.making_charges)      || 0
  const type   = data.making_charges_type || 'fixed'
  const weight = parseFloat(data.gross_silver_given)  || 0
  if (type === 'per_gram') return parseFloat((rate * weight).toFixed(2))
  return rate   // 'fixed' — amount as-is
}

function registerHandlers(ipcMain, db) {

  ipcMain.handle('transactions:get-all', (_, filters = {}) => {
    try {
      let query = `SELECT t.*,
        COALESCE(c.customer_name, t.party_name, 'Walk-in') as customer_name,
        c.business_name
        FROM transactions t
        LEFT JOIN customers c ON t.customer_id = c.id
        WHERE 1=1`
      const params = []
      if (filters.customerId) { query += ' AND t.customer_id = ?';       params.push(filters.customerId) }
      if (filters.type)       { query += ' AND t.transaction_type = ?';  params.push(filters.type) }
      if (filters.from)       { query += ' AND t.transaction_date >= ?'; params.push(filters.from) }
      if (filters.to)         { query += ' AND t.transaction_date <= ?'; params.push(filters.to) }
      if (filters.search) {
        query += ' AND (c.customer_name LIKE ? OR t.transaction_id LIKE ? OR t.remarks LIKE ?)'
        const s = `%${filters.search}%`
        params.push(s, s, s)
      }
      query += ' ORDER BY t.transaction_date DESC, t.created_at DESC'
      if (filters.limit) query += ` LIMIT ${parseInt(filters.limit)}`
      const data = db.prepare(query).all(...params)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:get-one', (_, id) => {
    try {
      const data = db.prepare(`SELECT t.*,
        COALESCE(c.customer_name, t.party_name, 'Walk-in') as customer_name,
        c.business_name
        FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id
        WHERE t.id = ?`).get(id)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:create', (_, data) => {
    try {
      const txnId = generateTransactionId()
      let recoverable = 0, balance = 0
      if (data.transaction_type === 'silver_issued') {
        recoverable = (data.gross_silver_given || 0) * (data.purity_percentage || 0) / 100
        balance = recoverable
      } else if (data.transaction_type === 'fine_received') {
        balance = -(data.fine_silver_received || 0)
      } else if (data.transaction_type === 'adjustment') {
        balance = data.balance_fine_silver || 0
      }
      const wastage = data.wastage_percentage || 0
      if (recoverable > 0 && wastage > 0) balance = recoverable * (1 - wastage / 100)

      const makingChargesAmount = calcMakingCharges(data)
      const makingChargesType   = data.making_charges_type || 'fixed'

      const result = db.prepare(`INSERT INTO transactions
        (transaction_id, transaction_date, customer_id, party_name, transaction_type,
         gross_silver_given, fine_silver_received, purity_percentage,
         recoverable_fine_silver, wastage_percentage, balance_fine_silver,
         payment_amount, making_charges, making_charges_type, remarks, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        txnId, data.transaction_date,
        data.customer_id || null,
        data.party_name || null,
        data.transaction_type,
        data.gross_silver_given || 0, data.fine_silver_received || 0,
        data.purity_percentage || 0, recoverable, wastage,
        data.balance_fine_silver !== undefined ? parseFloat(data.balance_fine_silver) : balance,
        data.payment_amount || 0, makingChargesAmount, makingChargesType,
        data.remarks, data.created_by || null
      )
      return { success: true, id: result.lastInsertRowid, transaction_id: txnId }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:update', (_, data) => {
    try {
      let recoverable = data.recoverable_fine_silver || 0
      if (data.transaction_type === 'silver_issued') {
        recoverable = (data.gross_silver_given || 0) * (data.purity_percentage || 0) / 100
      }
      const makingChargesAmount = calcMakingCharges(data)
      const makingChargesType   = data.making_charges_type || 'fixed'

      db.prepare(`UPDATE transactions SET
        transaction_date=?, customer_id=?, transaction_type=?,
        gross_silver_given=?, fine_silver_received=?, purity_percentage=?,
        recoverable_fine_silver=?, wastage_percentage=?, balance_fine_silver=?,
        payment_amount=?, making_charges=?, making_charges_type=?,
        remarks=?, updated_at=datetime('now','localtime')
        WHERE id=?`).run(
        data.transaction_date,
        data.customer_id,
        data.transaction_type,
        data.gross_silver_given    || 0,
        data.fine_silver_received  || 0,
        data.purity_percentage     || 0,
        recoverable,
        data.wastage_percentage    || 0,
        data.balance_fine_silver   || 0,
        data.payment_amount        || 0,
        makingChargesAmount,
        makingChargesType,
        data.remarks,
        data.id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:delete', (_, id) => {
    try {
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:get-ledger', (_, customerId) => {
    try {
      const transactions = db.prepare(`SELECT * FROM transactions
        WHERE customer_id = ?
        ORDER BY transaction_date ASC, created_at ASC`).all(customerId)
      let runningBalance = 0
      let runningCharges = 0
      const ledger = transactions.map(t => {
        if (t.transaction_type === 'silver_issued')  runningBalance += t.recoverable_fine_silver
        else if (t.transaction_type === 'fine_received')  runningBalance -= t.fine_silver_received
        else if (t.transaction_type === 'adjustment') runningBalance += t.balance_fine_silver
        runningCharges += (t.making_charges || 0)
        return { ...t, running_balance: runningBalance, running_charges: runningCharges }
      })
      return { success: true, data: ledger }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('transactions:get-summary', () => {
    try {
      const summary = db.prepare(`SELECT
        COALESCE(SUM(CASE WHEN transaction_type='silver_issued'  THEN gross_silver_given      ELSE 0 END),0) as total_issued,
        COALESCE(SUM(CASE WHEN transaction_type='fine_received'  THEN fine_silver_received    ELSE 0 END),0) as total_received,
        COALESCE(SUM(CASE WHEN transaction_type='silver_issued'  THEN recoverable_fine_silver ELSE 0 END),0) as total_recoverable,
        COALESCE(SUM(CASE WHEN transaction_type='fine_received'  THEN fine_silver_received    ELSE 0 END),0) as total_fine_back,
        COALESCE(SUM(making_charges), 0)                                                                     as total_making_charges
        FROM transactions`).get()
      summary.total_pending = (summary.total_recoverable || 0) - (summary.total_fine_back || 0)
      return { success: true, data: summary }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
