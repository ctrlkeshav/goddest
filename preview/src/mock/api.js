// Mounts window.api — identical surface to the real Electron preload.js
// All calls go to the localStorage mock db.

import {
  auth, customers, transactions, employees,
  deliveries, payments, documents, dashboard, reports, backup, accounts
} from './db.js'

function wrap(fn) {
  return (...args) => Promise.resolve(fn(...args))
}

window.api = {
  // App (stubs — no Electron shell in preview)
  getPaths: () => Promise.resolve({
    userDataPath: 'localStorage (browser)',
    documentsPath: 'localStorage/documents',
    backupPath: 'localStorage/backups'
  }),
  openExternal: (url) => { window.open(url, '_blank'); return Promise.resolve() },
  openPath: () => Promise.resolve(),
  openFileDialog: async (opts) => {
    // In browser we can use <input type=file> trick — return a simulated result
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      const exts = (opts?.filters?.[0]?.extensions || []).join(',.')
      if (exts) input.accept = '.' + exts
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) { resolve({ canceled: true, filePaths: [] }); return }
        // create a fake local path from the file name
        resolve({ canceled: false, filePaths: [file.name], files: [file] })
      }
      input.oncancel = () => resolve({ canceled: true, filePaths: [] })
      input.click()
    })
  },
  saveFileDialog: () => Promise.resolve({ canceled: true }),

  // Auth
  login:              wrap((d) => auth.login(d)),
  logout:             () => Promise.resolve(),
  changePassword:     wrap((d) => auth.changePassword(d)),
  resetUserPassword:  wrap((d) => { const db = load(); const u = db.users.find(u => u.id === d.userId); if (u) { u.password_hash = bcrypt.hash(d.newPassword); save(db); } return { success: true } }),
  getUsers:           wrap(()  => auth.getUsers()),
  createUser:         wrap((d) => auth.createUser(d)),
  updateUser:         wrap((d) => auth.updateUser(d)),
  updatePermissions:  wrap((d) => { const db = load(); const u = db.users.find(u => u.id === d.userId); if (u) { u.can_add_transaction = d.can_add_transaction ? 1 : 0; u.can_edit_record = d.can_edit_record ? 1 : 0; save(db); } return { success: true } }),
  deleteUser:         wrap((id) => auth.deleteUser(id)),
  getActivityLog:     wrap((f) => auth.getActivityLog(f)),

  // Customers
  getCustomers:    wrap((f) => customers.getAll(f)),
  getCustomer:     wrap((id) => customers.getOne(id)),
  createCustomer:  wrap((d) => customers.create(d)),
  updateCustomer:  wrap((d) => customers.update(d)),
  deleteCustomer:  wrap((id) => customers.delete(id)),
  searchCustomers: wrap((q) => customers.search(q)),

  // Transactions
  getTransactions:     wrap((f) => transactions.getAll(f)),
  getTransaction:      wrap((id) => transactions.getOne(id)),
  createTransaction:   wrap((d) => transactions.create(d)),
  updateTransaction:   wrap((d) => transactions.update(d)),
  deleteTransaction:   wrap((id) => transactions.delete(id)),
  getCustomerLedger:   wrap((id) => transactions.getLedger(id)),
  getTransactionSummary: wrap(() => transactions.getSummary()),

  // Deliveries
  getDeliveries:   wrap((f) => deliveries.getAll(f)),
  getDelivery:     wrap((id) => deliveries.getOne(id)),
  createDelivery:  wrap((d) => deliveries.create(d)),
  updateDelivery:  wrap((d) => deliveries.update(d)),
  deleteDelivery:  wrap((id) => deliveries.delete(id)),

  // Employees
  getEmployees:          wrap((f) => employees.getAll(f)),
  getEmployee:           wrap((id) => employees.getOne(id)),
  createEmployee:        wrap((d) => employees.create(d)),
  updateEmployee:        wrap((d) => employees.update(d)),
  deleteEmployee:        wrap((id) => employees.delete(id)),
  getEmployeeStats:      wrap((id) => employees.getStats(id)),
  assignEmployeeLogin:   wrap((d) => { return { success: true } }),
  updateEmployeePerms:   wrap((d) => { return { success: true } }),
  removeEmployeeLogin:   wrap((id) => { return { success: true } }),

  // General Accounts
  getAccounts:       wrap((f) => accounts.getAll(f)),
  getAccount:        wrap((id) => accounts.getOne(id)),
  createAccount:     wrap((d) => accounts.create(d)),
  updateAccount:     wrap((d) => accounts.update(d)),
  deleteAccount:     wrap((id) => accounts.delete(id)),
  getAccountSummary: wrap((f) => accounts.getSummary(f)),
  getAccountMonthly: wrap((f) => accounts.getMonthly(f)),

  // Payments
  getPayments:            wrap((f) => payments.getAll(f)),
  getPayment:             wrap((id) => payments.getOne(id)),
  createPayment:          wrap((d) => payments.create(d)),
  updatePayment:          wrap((d) => payments.update(d)),
  deletePayment:          wrap((id) => payments.delete(id)),
  getCustomerPaymentSummary: wrap((id) => payments.getCustomerSummary(id)),

  // Documents
  getDocuments:    wrap((f) => documents.getAll(f)),
  uploadDocument:  wrap((d) => documents.upload(d)),
  deleteDocument:  wrap((id) => documents.delete(id)),
  openDocument:    wrap((id) => documents.open(id)),
  downloadDocument: wrap((id) => documents.download(id)),

  // Dashboard
  getDashboardStats:      wrap(() => dashboard.getStats()),
  getMonthlyMovement:     wrap(() => dashboard.getMonthlyMovement()),
  getCustomerBalances:    wrap(() => dashboard.getCustomerBalances()),
  getPaymentTrends:       wrap(() => dashboard.getPaymentTrends()),
  getRecentTransactions:  wrap(() => dashboard.getRecentTransactions()),
  getTopPendingCustomers: wrap(() => dashboard.getTopPending()),

  // Reports
  generateCustomerLedger:  wrap((d) => reports.customerLedger(d)),
  generateSilverStatement: wrap((d) => reports.silverStatement(d)),
  generateDeliveryReport:  wrap((d) => reports.deliveryReport(d)),
  generatePendingBalance:  wrap(() => reports.pendingBalance()),
  generatePaymentHistory:  wrap((d) => reports.paymentHistory(d)),
  exportToExcel:           wrap((d) => reports.exportExcel(d)),
  exportToCSV:             wrap((d) => reports.exportCSV(d)),

  // Backup
  createBackup:  wrap(() => backup.create()),
  restoreBackup: wrap((p) => backup.restore(p)),
  listBackups:   wrap(() => backup.list()),
}
