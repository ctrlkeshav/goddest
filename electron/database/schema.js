/**
 * schema.js — Goddest Metals Company
 * Full schema with all tables + safe migrations.
 */

function initializeSchema(db) {

  // ── Core tables ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      username            TEXT UNIQUE NOT NULL,
      password_hash       TEXT NOT NULL,
      full_name           TEXT NOT NULL,
      role                TEXT NOT NULL CHECK(role IN ('admin','staff')),
      employee_id         INTEGER,
      can_add_transaction INTEGER DEFAULT 1,
      can_edit_record     INTEGER DEFAULT 1,
      is_active           INTEGER DEFAULT 1,
      created_at          TEXT DEFAULT (datetime('now','localtime')),
      updated_at          TEXT DEFAULT (datetime('now','localtime')),
      last_login          TEXT
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      username   TEXT,
      action     TEXT NOT NULL,
      module     TEXT NOT NULL,
      record_id  TEXT,
      details    TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      business_name TEXT,
      mobile        TEXT,
      address       TEXT,
      gst_number    TEXT,
      city          TEXT,
      state         TEXT,
      notes         TEXT,
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      updated_at    TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id          TEXT UNIQUE NOT NULL,
      transaction_date        TEXT NOT NULL,
      customer_id             INTEGER,
      party_name              TEXT,
      transaction_type        TEXT NOT NULL CHECK(transaction_type IN (
                                'silver_issued','fine_received',
                                'payment_received','adjustment'
                              )),
      gross_silver_given      REAL DEFAULT 0,
      fine_silver_received    REAL DEFAULT 0,
      purity_percentage       REAL DEFAULT 0,
      recoverable_fine_silver REAL DEFAULT 0,
      wastage_percentage      REAL DEFAULT 0,
      balance_fine_silver     REAL DEFAULT 0,
      payment_amount          REAL DEFAULT 0,
      making_charges          REAL DEFAULT 0,
      making_charges_type     TEXT DEFAULT 'fixed',
      remarks                 TEXT,
      created_by              INTEGER,
      created_at              TEXT DEFAULT (datetime('now','localtime')),
      updated_at              TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      mobile        TEXT,
      designation   TEXT,
      joining_date  TEXT,
      is_active     INTEGER DEFAULT 1,
      notes         TEXT,
      user_id       INTEGER,
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      updated_at    TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_date           TEXT NOT NULL,
      destination_city        TEXT,
      destination_state       TEXT,
      customer_id             INTEGER,
      employee_id             INTEGER,
      vehicle_details         TEXT,
      purpose                 TEXT,
      silver_weight_delivered REAL DEFAULT 0,
      fine_silver_collected   REAL DEFAULT 0,
      travel_expenses         REAL DEFAULT 0,
      notes                   TEXT,
      created_by              INTEGER,
      created_at              TEXT DEFAULT (datetime('now','localtime')),
      updated_at              TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_date     TEXT NOT NULL,
      customer_id      INTEGER,
      party_name       TEXT,
      payment_amount   REAL NOT NULL,
      payment_method   TEXT NOT NULL CHECK(payment_method IN (
                         'cash','bank_transfer','cheque','upi'
                       )),
      reference_number TEXT,
      notes            TEXT,
      created_by       INTEGER,
      created_at       TEXT DEFAULT (datetime('now','localtime')),
      updated_at       TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      document_name     TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename   TEXT NOT NULL,
      file_type         TEXT NOT NULL,
      file_size         INTEGER,
      document_category TEXT NOT NULL,
      customer_id       INTEGER,
      transaction_id    INTEGER,
      delivery_id       INTEGER,
      payment_id        INTEGER,
      account_id        INTEGER,
      notes             TEXT,
      uploaded_by       INTEGER,
      created_at        TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS general_accounts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date       TEXT NOT NULL,
      entry_type       TEXT NOT NULL CHECK(entry_type IN (
                         'income','expense','silver_purchase','silver_sale',
                         'bank_deposit','bank_withdrawal','loan_given',
                         'loan_received','other'
                       )),
      category         TEXT,
      party_name       TEXT,
      amount           REAL NOT NULL DEFAULT 0,
      silver_weight    REAL DEFAULT 0,
      silver_rate      REAL DEFAULT 0,
      payment_method   TEXT CHECK(payment_method IN (
                         'cash','bank_transfer','cheque','upi','other',NULL
                       )),
      reference_number TEXT,
      description      TEXT,
      created_by       INTEGER,
      created_at       TEXT DEFAULT (datetime('now','localtime')),
      updated_at       TEXT DEFAULT (datetime('now','localtime'))
    );
  `)

  // ── Safe column migrations (add missing columns to existing DBs) ────────────
  const migrations = [
    { table: 'users',             column: 'updated_at',           def: `TEXT DEFAULT (datetime('now','localtime'))` },
    { table: 'users',             column: 'last_login',           def: `TEXT` },
    { table: 'users',             column: 'employee_id',          def: `INTEGER` },
    { table: 'users',             column: 'can_add_transaction',  def: `INTEGER DEFAULT 1` },
    { table: 'users',             column: 'can_edit_record',      def: `INTEGER DEFAULT 1` },
    { table: 'transactions',      column: 'making_charges',       def: `REAL DEFAULT 0` },
    { table: 'transactions',      column: 'making_charges_type',  def: `TEXT DEFAULT 'fixed'` },
    { table: 'transactions',      column: 'party_name',           def: `TEXT` },
    { table: 'employees',         column: 'user_id',              def: `INTEGER` },
    { table: 'payments',          column: 'party_name',           def: `TEXT` },
    { table: 'documents',         column: 'account_id',           def: `INTEGER` },
  ]

  for (const m of migrations) {
    try {
      const cols = db.prepare(`PRAGMA table_info(${m.table})`).all()
      const exists = cols.some(c => c.name === m.column)
      if (!exists) {
        db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.def}`)
        console.log(`[schema] Added ${m.table}.${m.column}`)
      }
    } catch (e) {
      console.warn(`[schema] Migration skipped ${m.table}.${m.column}:`, e.message)
    }
  }

  // Handle transactions.customer_id NOT NULL → make nullable via recreate if needed
  try {
    const cols = db.prepare('PRAGMA table_info(transactions)').all()
    const cidCol = cols.find(c => c.name === 'customer_id')
    if (cidCol && cidCol.notnull === 1) {
      // Recreate transactions without NOT NULL on customer_id
      db.exec(`
        CREATE TABLE IF NOT EXISTS transactions_new (
          id                      INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id          TEXT UNIQUE NOT NULL,
          transaction_date        TEXT NOT NULL,
          customer_id             INTEGER,
          party_name              TEXT,
          transaction_type        TEXT NOT NULL,
          gross_silver_given      REAL DEFAULT 0,
          fine_silver_received    REAL DEFAULT 0,
          purity_percentage       REAL DEFAULT 0,
          recoverable_fine_silver REAL DEFAULT 0,
          wastage_percentage      REAL DEFAULT 0,
          balance_fine_silver     REAL DEFAULT 0,
          payment_amount          REAL DEFAULT 0,
          making_charges          REAL DEFAULT 0,
          making_charges_type     TEXT DEFAULT 'fixed',
          remarks                 TEXT,
          created_by              INTEGER,
          created_at              TEXT DEFAULT (datetime('now','localtime')),
          updated_at              TEXT DEFAULT (datetime('now','localtime'))
        );
        INSERT INTO transactions_new SELECT
          id, transaction_id, transaction_date, customer_id,
          NULL as party_name,
          transaction_type, gross_silver_given, fine_silver_received,
          purity_percentage, recoverable_fine_silver, wastage_percentage,
          balance_fine_silver, payment_amount,
          COALESCE(making_charges,0), COALESCE(making_charges_type,'fixed'),
          remarks, created_by, created_at, updated_at
        FROM transactions;
        DROP TABLE transactions;
        ALTER TABLE transactions_new RENAME TO transactions;
      `)
      console.log('[schema] Migrated transactions.customer_id to nullable')
    }
  } catch (e) {
    console.warn('[schema] transactions nullable migration skipped:', e.message)
  }

  // ── Indexes ─────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_customer  ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_deliveries_customer    ON deliveries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_date        ON deliveries(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_deliveries_employee    ON deliveries(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payments_customer      ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date          ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_documents_customer     ON documents(customer_id);
    CREATE INDEX IF NOT EXISTS idx_documents_transaction  ON documents(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user      ON activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_name         ON customers(customer_name);
    CREATE INDEX IF NOT EXISTS idx_general_accounts_date  ON general_accounts(entry_date);
    CREATE INDEX IF NOT EXISTS idx_general_accounts_type  ON general_accounts(entry_type);
  `)

  // ── Seed default admin ──────────────────────────────────────────────────────
  const row = db.prepare('SELECT COUNT(*) as c FROM users').get()
  if ((row?.c ?? 0) === 0) {
    const bcrypt = require('bcryptjs')
    const hash = bcrypt.hashSync('nimda321', 10)
    db.prepare(`INSERT INTO users (username, password_hash, full_name, role, can_add_transaction, can_edit_record)
      VALUES (?, ?, ?, ?, 1, 1)`).run('admin', hash, 'Administrator', 'admin')
    console.log('[schema] Default admin created — login: admin / nimda321')
  }
}

module.exports = { initializeSchema }
