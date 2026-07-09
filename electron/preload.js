const { contextBridge, ipcRenderer } = require('electron')
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  // ── App ────────────────────────────────────────────────────────────────────
  getPaths:        ()       => invoke('app:get-paths'),
  openExternal:    (url)    => invoke('app:open-external', url),
  openPath:        (p)      => invoke('shell:open-path', p),
  openFileDialog:  (opts)   => invoke('dialog:open-file', opts),
  saveFileDialog:  (opts)   => invoke('dialog:save-file', opts),

  // ── Auth ───────────────────────────────────────────────────────────────────
  login:              (d)          => invoke('auth:login', d),
  logout:             ()           => invoke('auth:logout'),
  changePassword:     (d)          => invoke('auth:change-password', d),
  resetUserPassword:  (d)          => invoke('auth:reset-user-password', d),
  getUsers:           ()           => invoke('auth:get-users'),
  createUser:         (d)          => invoke('auth:create-user', d),
  updateUser:         (d)          => invoke('auth:update-user', d),
  updatePermissions:  (d)          => invoke('auth:update-permissions', d),
  deleteUser:         (id)         => invoke('auth:delete-user', id),
  getActivityLog:     (f)          => invoke('auth:get-activity-log', f),

  // ── Customers ──────────────────────────────────────────────────────────────
  getCustomers:    (f)  => invoke('customers:get-all', f),
  getCustomer:     (id) => invoke('customers:get-one', id),
  createCustomer:  (d)  => invoke('customers:create', d),
  updateCustomer:  (d)  => invoke('customers:update', d),
  deleteCustomer:  (id) => invoke('customers:delete', id),
  searchCustomers: (q)  => invoke('customers:search', q),

  // ── Transactions ───────────────────────────────────────────────────────────
  getTransactions:       (f)  => invoke('transactions:get-all', f),
  getTransaction:        (id) => invoke('transactions:get-one', id),
  createTransaction:     (d)  => invoke('transactions:create', d),
  updateTransaction:     (d)  => invoke('transactions:update', d),
  deleteTransaction:     (id) => invoke('transactions:delete', id),
  getCustomerLedger:     (id) => invoke('transactions:get-ledger', id),
  getTransactionSummary: ()   => invoke('transactions:get-summary'),

  // ── Deliveries ─────────────────────────────────────────────────────────────
  getDeliveries:  (f)  => invoke('deliveries:get-all', f),
  getDelivery:    (id) => invoke('deliveries:get-one', id),
  createDelivery: (d)  => invoke('deliveries:create', d),
  updateDelivery: (d)  => invoke('deliveries:update', d),
  deleteDelivery: (id) => invoke('deliveries:delete', id),

  // ── Employees ──────────────────────────────────────────────────────────────
  getEmployees:          (f)  => invoke('employees:get-all', f),
  getEmployee:           (id) => invoke('employees:get-one', id),
  createEmployee:        (d)  => invoke('employees:create', d),
  updateEmployee:        (d)  => invoke('employees:update', d),
  deleteEmployee:        (id) => invoke('employees:delete', id),
  getEmployeeStats:      (id) => invoke('employees:get-stats', id),
  assignEmployeeLogin:   (d)  => invoke('employees:assign-login', d),
  updateEmployeePerms:   (d)  => invoke('employees:update-permissions', d),
  removeEmployeeLogin:   (id) => invoke('employees:remove-login', id),

  // ── Payments ───────────────────────────────────────────────────────────────
  getPayments:               (f)  => invoke('payments:get-all', f),
  getPayment:                (id) => invoke('payments:get-one', id),
  createPayment:             (d)  => invoke('payments:create', d),
  updatePayment:             (d)  => invoke('payments:update', d),
  deletePayment:             (id) => invoke('payments:delete', id),
  getCustomerPaymentSummary: (id) => invoke('payments:get-customer-summary', id),

  // ── Documents ──────────────────────────────────────────────────────────────
  getDocuments:    (f)       => invoke('documents:get-all', f),
  uploadDocument:  (d)       => invoke('documents:upload', d),
  deleteDocument:  (id)      => invoke('documents:delete', id),
  openDocument:    (id)      => invoke('documents:open', id),
  downloadDocument:(id, dst) => invoke('documents:download', id, dst),

  // ── General Accounts ───────────────────────────────────────────────────────
  getAccounts:        (f) => invoke('accounts:get-all', f),
  getAccount:         (id)=> invoke('accounts:get-one', id),
  createAccount:      (d) => invoke('accounts:create', d),
  updateAccount:      (d) => invoke('accounts:update', d),
  deleteAccount:      (id)=> invoke('accounts:delete', id),
  getAccountSummary:  (f) => invoke('accounts:get-summary', f),
  getAccountMonthly:  (f) => invoke('accounts:get-monthly', f),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardStats:      () => invoke('dashboard:get-stats'),
  getMonthlyMovement:     () => invoke('dashboard:get-monthly-movement'),
  getCustomerBalances:    () => invoke('dashboard:get-customer-balances'),
  getPaymentTrends:       () => invoke('dashboard:get-payment-trends'),
  getRecentTransactions:  () => invoke('dashboard:get-recent-transactions'),
  getTopPendingCustomers: () => invoke('dashboard:get-top-pending'),

  // ── Reports ────────────────────────────────────────────────────────────────
  generateCustomerLedger:  (d) => invoke('reports:customer-ledger', d),
  generateSilverStatement: (d) => invoke('reports:silver-statement', d),
  generateDeliveryReport:  (d) => invoke('reports:delivery-report', d),
  generatePendingBalance:  (d) => invoke('reports:pending-balance', d),
  generatePaymentHistory:  (d) => invoke('reports:payment-history', d),
  exportToExcel:           (d) => invoke('reports:export-excel', d),
  exportToCSV:             (d) => invoke('reports:export-csv', d),

  // ── Backup ─────────────────────────────────────────────────────────────────
  createBackup:  ()    => invoke('backup:create'),
  restoreBackup: (p)   => invoke('backup:restore', p),
  listBackups:   ()    => invoke('backup:list'),
})
