const { contextBridge, ipcRenderer } = require('electron')

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  // App
  getPaths: () => invoke('app:get-paths'),
  openExternal: (url) => invoke('app:open-external', url),
  openPath: (p) => invoke('shell:open-path', p),
  openFileDialog: (options) => invoke('dialog:open-file', options),
  saveFileDialog: (options) => invoke('dialog:save-file', options),

  // Auth
  login: (data) => invoke('auth:login', data),
  logout: () => invoke('auth:logout'),
  changePassword: (data) => invoke('auth:change-password', data),
  getUsers: () => invoke('auth:get-users'),
  createUser: (data) => invoke('auth:create-user', data),
  updateUser: (data) => invoke('auth:update-user', data),
  deleteUser: (id) => invoke('auth:delete-user', id),
  getActivityLog: (filters) => invoke('auth:get-activity-log', filters),

  // Customers
  getCustomers: (filters) => invoke('customers:get-all', filters),
  getCustomer: (id) => invoke('customers:get-one', id),
  createCustomer: (data) => invoke('customers:create', data),
  updateCustomer: (data) => invoke('customers:update', data),
  deleteCustomer: (id) => invoke('customers:delete', id),
  searchCustomers: (q) => invoke('customers:search', q),

  // Transactions
  getTransactions: (filters) => invoke('transactions:get-all', filters),
  getTransaction: (id) => invoke('transactions:get-one', id),
  createTransaction: (data) => invoke('transactions:create', data),
  updateTransaction: (data) => invoke('transactions:update', data),
  deleteTransaction: (id) => invoke('transactions:delete', id),
  getCustomerLedger: (customerId) => invoke('transactions:get-ledger', customerId),
  getTransactionSummary: () => invoke('transactions:get-summary'),

  // Deliveries
  getDeliveries: (filters) => invoke('deliveries:get-all', filters),
  getDelivery: (id) => invoke('deliveries:get-one', id),
  createDelivery: (data) => invoke('deliveries:create', data),
  updateDelivery: (data) => invoke('deliveries:update', data),
  deleteDelivery: (id) => invoke('deliveries:delete', id),

  // Employees
  getEmployees: (filters) => invoke('employees:get-all', filters),
  getEmployee: (id) => invoke('employees:get-one', id),
  createEmployee: (data) => invoke('employees:create', data),
  updateEmployee: (data) => invoke('employees:update', data),
  deleteEmployee: (id) => invoke('employees:delete', id),
  getEmployeeStats: (id) => invoke('employees:get-stats', id),

  // Payments
  getPayments: (filters) => invoke('payments:get-all', filters),
  getPayment: (id) => invoke('payments:get-one', id),
  createPayment: (data) => invoke('payments:create', data),
  updatePayment: (data) => invoke('payments:update', data),
  deletePayment: (id) => invoke('payments:delete', id),
  getCustomerPaymentSummary: (customerId) => invoke('payments:get-customer-summary', customerId),

  // Documents
  getDocuments: (filters) => invoke('documents:get-all', filters),
  uploadDocument: (data) => invoke('documents:upload', data),
  deleteDocument: (id) => invoke('documents:delete', id),
  openDocument: (id) => invoke('documents:open', id),
  downloadDocument: (id, dest) => invoke('documents:download', id, dest),

  // Dashboard
  getDashboardStats: () => invoke('dashboard:get-stats'),
  getMonthlyMovement: () => invoke('dashboard:get-monthly-movement'),
  getCustomerBalances: () => invoke('dashboard:get-customer-balances'),
  getPaymentTrends: () => invoke('dashboard:get-payment-trends'),
  getRecentTransactions: () => invoke('dashboard:get-recent-transactions'),
  getTopPendingCustomers: () => invoke('dashboard:get-top-pending'),

  // Reports
  generateCustomerLedger: (data) => invoke('reports:customer-ledger', data),
  generateSilverStatement: (data) => invoke('reports:silver-statement', data),
  generateDeliveryReport: (data) => invoke('reports:delivery-report', data),
  generatePendingBalance: (data) => invoke('reports:pending-balance', data),
  generatePaymentHistory: (data) => invoke('reports:payment-history', data),
  exportToExcel: (data) => invoke('reports:export-excel', data),
  exportToCSV: (data) => invoke('reports:export-csv', data),

  // Backup
  createBackup: () => invoke('backup:create'),
  restoreBackup: (filePath) => invoke('backup:restore', filePath),
  listBackups: () => invoke('backup:list'),
})
