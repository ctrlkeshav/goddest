function registerHandlers(ipcMain, db) {
  ipcMain.handle('dashboard:get-stats', () => {
    try {
      const silver = db.prepare(`SELECT
        COALESCE(SUM(CASE WHEN transaction_type='silver_issued' THEN gross_silver_given ELSE 0 END),0) as total_issued,
        COALESCE(SUM(CASE WHEN transaction_type='fine_received' THEN fine_silver_received ELSE 0 END),0) as total_received,
        COALESCE(SUM(CASE WHEN transaction_type='silver_issued' THEN recoverable_fine_silver ELSE 0 END),0) as total_recoverable
        FROM transactions`).get()
      silver.total_pending = (silver.total_recoverable || 0) - (silver.total_received || 0)

      const payments = db.prepare(`SELECT
        COALESCE(SUM(payment_amount),0) as total_payments FROM payments`).get()

      const thisMonth = new Date()
      const monthStart = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth()+1).padStart(2,'0')}-01`
      const deliveries = db.prepare(`SELECT COUNT(*) as count FROM deliveries
        WHERE delivery_date >= ?`).get(monthStart)

      const customers = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE is_active=1`).get()
      const transactions = db.prepare(`SELECT COUNT(*) as count FROM transactions`).get()

      return {
        success: true,
        data: {
          total_silver_issued: silver.total_issued,
          total_fine_received: silver.total_received,
          total_pending_fine: silver.total_pending,
          total_payments: payments.total_payments,
          deliveries_this_month: deliveries.count,
          total_customers: customers.count,
          total_transactions: transactions.count
        }
      }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dashboard:get-monthly-movement', () => {
    try {
      const data = db.prepare(`SELECT
        strftime('%Y-%m', transaction_date) as month,
        COALESCE(SUM(CASE WHEN transaction_type='silver_issued' THEN gross_silver_given ELSE 0 END),0) as issued,
        COALESCE(SUM(CASE WHEN transaction_type='fine_received' THEN fine_silver_received ELSE 0 END),0) as received
        FROM transactions
        WHERE transaction_date >= date('now','-12 months')
        GROUP BY month ORDER BY month ASC`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dashboard:get-customer-balances', () => {
    try {
      const data = db.prepare(`SELECT c.customer_name,
        COALESCE(SUM(CASE WHEN t.transaction_type='silver_issued' THEN t.recoverable_fine_silver ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN t.transaction_type='fine_received' THEN t.fine_silver_received ELSE 0 END),0) as balance
        FROM customers c JOIN transactions t ON c.id = t.customer_id
        WHERE c.is_active=1
        GROUP BY c.id HAVING balance > 0
        ORDER BY balance DESC LIMIT 10`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dashboard:get-payment-trends', () => {
    try {
      const data = db.prepare(`SELECT
        strftime('%Y-%m', payment_date) as month,
        COALESCE(SUM(payment_amount),0) as amount,
        COUNT(*) as count
        FROM payments
        WHERE payment_date >= date('now','-12 months')
        GROUP BY month ORDER BY month ASC`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dashboard:get-recent-transactions', () => {
    try {
      const data = db.prepare(`SELECT t.*, c.customer_name
        FROM transactions t JOIN customers c ON t.customer_id = c.id
        ORDER BY t.created_at DESC LIMIT 10`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('dashboard:get-top-pending', () => {
    try {
      const data = db.prepare(`SELECT c.id, c.customer_name, c.mobile, c.city,
        COALESCE(SUM(CASE WHEN t.transaction_type='silver_issued' THEN t.recoverable_fine_silver ELSE 0 END),0) -
        COALESCE(SUM(CASE WHEN t.transaction_type='fine_received' THEN t.fine_silver_received ELSE 0 END),0) as pending_fine
        FROM customers c LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE c.is_active=1
        GROUP BY c.id HAVING pending_fine > 0
        ORDER BY pending_fine DESC LIMIT 8`).all()
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

module.exports = { registerHandlers }
