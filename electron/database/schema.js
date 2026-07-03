function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','staff')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      business_name TEXT,
      mobile TEXT,
      address TEXT,
      gst_number TEXT,
      city TEXT,
      state TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      transaction_date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN (
        'silver_issued','fine_received','payment_received','adjustment'
      )),
      gross_silver_given REAL DEFAULT 0,
      fine_silver_received REAL DEFAULT 0,
      purity_percentage REAL DEFAULT 0,
      recoverable_fine_silver REAL DEFAULT 0,
      wastage_percentage REAL DEFAULT 0,
      balance_fine_silver REAL DEFAULT 0,
      payment_amount REAL DEFAULT 0,
      remarks TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      mobile TEXT,
      designation TEXT,
      joining_date TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_date TEXT NOT NULL,
      destination_city TEXT,
      destination_state TEXT,
      customer_id INTEGER,
      employee_id INTEGER,
      vehicle_details TEXT,
      purpose TEXT,
      silver_weight_delivered REAL DEFAULT 0,
      fine_silver_collected REAL DEFAULT 0,
      travel_expenses REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(employee_id) REFERENCES employees(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      payment_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','bank_transfer','cheque','upi')),
      reference_number TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_name TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      document_category TEXT NOT NULL,
      customer_id INTEGER,
      transaction_id INTEGER,
      delivery_id INTEGER,
      payment_id INTEGER,
      notes TEXT,
      uploaded_by INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(customer_id) REFERENCES customers(id),
      FOREIGN KEY(transaction_id) REFERENCES transactions(id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_deliveries_employee ON deliveries(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
    CREATE INDEX IF NOT EXISTS idx_documents_transaction ON documents(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
  `)

  // Seed default admin if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get()
  if (userCount.c === 0) {
    const bcrypt = require('bcryptjs')
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare(`INSERT INTO users (username, password_hash, full_name, role)
      VALUES ('admin', ?, 'Administrator', 'admin')`).run(hash)
  }
}

module.exports = { initializeSchema }
