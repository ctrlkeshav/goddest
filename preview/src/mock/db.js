// ─── LocalStorage-backed in-memory database ──────────────────────────────────
// Mirrors every window.api.* call from the real Electron preload.
// All data lives in localStorage under the key 'gm_db'.

import { v4 as uuidv4 } from 'uuid'
import bcrypt from './bcrypt-shim.js'

// ── helpers ───────────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem('gm_db') || 'null') || freshDB() }
  catch { return freshDB() }
}

function save(db) {
  localStorage.setItem('gm_db', JSON.stringify(db))
}

function nextId(table) {
  const db = load()
  const rows = db[table] || []
  return rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function generateTxnId() {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `TXN${yy}${mm}${dd}${rand}`
}

function ok(data) { return { success: true, data } }
function err(msg) { return { success: false, error: msg } }

// ── seed data ─────────────────────────────────────────────────────────────────

function freshDB() {
  const db = {
    users: [], customers: [], transactions: [], employees: [],
    deliveries: [], payments: [], documents: [], activity_log: [],
    general_accounts: []
  }
  // default admin — password: nimda321
  db.users.push({
    id: 1, username: 'admin', password_hash: 'ADMIN_HASH',
    full_name: 'Administrator', role: 'admin', is_active: 1,
    can_add_transaction: 1, can_edit_record: 1, employee_id: null,
    created_at: now(), last_login: null
  })
  // seed demo customers
  const custNames = [
    ['Ramesh Jewellers', 'Ramesh Kumar', 'Mumbai', 'Maharashtra'],
    ['Patel Silver Works', 'Suresh Patel', 'Surat', 'Gujarat'],
    ['Golden Touch', 'Anita Sharma', 'Jaipur', 'Rajasthan'],
    ['Silver Craft Co.', 'Vikram Singh', 'Delhi', 'Delhi'],
  ]
  custNames.forEach(([biz, name, city, state], i) => {
    db.customers.push({
      id: i + 1, customer_name: name, business_name: biz,
      mobile: `98${String(10000000 + i * 11111111).slice(0, 8)}`,
      address: `${100 + i} Main Road`, gst_number: `${22 + i}AABCS1429B1Z5`,
      city, state, notes: '', is_active: 1, created_at: now(), updated_at: now()
    })
  })
  // seed demo employees
  const empData = [
    ['Rajesh Verma', '9876543210', 'Driver', '2022-01-15'],
    ['Mohan Das', '9988776655', 'Manager', '2021-06-01'],
  ]
  empData.forEach(([n, m, d, j], i) => {
    db.employees.push({ id: i + 1, employee_name: n, mobile: m, designation: d, joining_date: j, is_active: 1, notes: '', created_at: now(), updated_at: now() })
  })
  // seed demo transactions
  const txnSeeds = [
    { cid: 1, type: 'silver_issued', gross: 1000, purity: 95.5, wastage: 2 },
    { cid: 1, type: 'fine_received', fine: 850 },
    { cid: 2, type: 'silver_issued', gross: 2000, purity: 92, wastage: 1.5 },
    { cid: 3, type: 'silver_issued', gross: 500, purity: 99, wastage: 0.5 },
    { cid: 3, type: 'fine_received', fine: 300 },
    { cid: 4, type: 'silver_issued', gross: 750, purity: 88, wastage: 3 },
  ]
  txnSeeds.forEach((s, i) => {
    const recoverable = s.gross ? s.gross * s.purity / 100 : 0
    const balance = recoverable ? recoverable * (1 - s.wastage / 100) : -(s.fine || 0)
    const daysAgo = (txnSeeds.length - i) * 5
    const d = new Date(); d.setDate(d.getDate() - daysAgo)
    db.transactions.push({
      id: i + 1, transaction_id: generateTxnId(),
      transaction_date: d.toISOString().slice(0, 10),
      customer_id: s.cid, transaction_type: s.type,
      gross_silver_given: s.gross || 0,
      fine_silver_received: s.fine || 0,
      purity_percentage: s.purity || 0,
      recoverable_fine_silver: recoverable,
      wastage_percentage: s.wastage || 0,
      balance_fine_silver: balance,
      payment_amount: 0, remarks: 'Seed data',
      created_by: 1, created_at: d.toISOString().replace('T', ' ').slice(0, 19),
      updated_at: d.toISOString().replace('T', ' ').slice(0, 19)
    })
  })
  // seed payments
  db.payments.push({
    id: 1, payment_date: today(), customer_id: 1, payment_amount: 15000,
    payment_method: 'bank_transfer', reference_number: 'UTR123456',
    notes: 'Partial payment', created_by: 1, created_at: now(), updated_at: now()
  })
  // seed one delivery
  db.deliveries.push({
    id: 1, delivery_date: today(), destination_city: 'Mumbai',
    destination_state: 'Maharashtra', customer_id: 1, employee_id: 1,
    vehicle_details: 'MH-12-AB-1234', purpose: 'Silver delivery and collection',
    silver_weight_delivered: 1000, fine_silver_collected: 850,
    travel_expenses: 1200, notes: '', created_by: 1, created_at: now(), updated_at: now()
  })
  return db
}


// ── AUTH ──────────────────────────────────────────────────────────────────────

export const auth = {
  login({ username, password }) {
    const db = load()
    const user = db.users.find(u => u.username === username && u.is_active)
    if (!user) return err('Invalid credentials')
    const valid = (user.password_hash === 'ADMIN_HASH' && password === 'nimda321')
      || bcrypt.compare(password, user.password_hash)
    if (!valid) return err('Invalid credentials')
    user.last_login = now()
    save(db)
    const { password_hash, ...safe } = user
    return ok(safe)
  },
  changePassword({ userId, oldPassword, newPassword }) {
    const db = load()
    const user = db.users.find(u => u.id === userId)
    if (!user) return err('User not found')
    const valid = (user.password_hash === 'ADMIN_HASH' && oldPassword === 'nimda321')
      || bcrypt.compare(oldPassword, user.password_hash)
    if (!valid) return err('Current password is incorrect')
    user.password_hash = bcrypt.hash(newPassword)
    save(db)
    return ok(true)
  },
  getUsers() {
    const db = load()
    return ok(db.users.map(({ password_hash, ...u }) => u))
  },
  createUser(data) {
    const db = load()
    if (db.users.find(u => u.username === data.username)) return err('Username already exists')
    const id = nextId('users')
    db.users.push({
      id, username: data.username, password_hash: bcrypt.hash(data.password),
      full_name: data.full_name, role: data.role, is_active: 1,
      created_at: now(), last_login: null
    })
    save(db)
    return ok(id)
  },
  updateUser(data) {
    const db = load()
    const u = db.users.find(u => u.id === data.id)
    if (!u) return err('Not found')
    Object.assign(u, { full_name: data.full_name, role: data.role, is_active: data.is_active })
    save(db); return ok(true)
  },
  deleteUser(id) {
    const db = load()
    const u = db.users.find(u => u.id === id)
    if (u) { u.is_active = 0; save(db) }
    return ok(true)
  },
  getActivityLog(filters = {}) {
    const db = load()
    return ok(db.activity_log.slice(-500).reverse())
  }
}


// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

function customerWithStats(c, db) {
  const txns = db.transactions.filter(t => t.customer_id === c.id)
  const total_silver_issued = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.gross_silver_given || 0), 0)
  const total_fine_received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
  const total_recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
  const total_payments = db.payments.filter(p => p.customer_id === c.id).reduce((s, p) => s + (p.payment_amount || 0), 0)
  return { ...c, total_silver_issued, total_fine_received, total_recoverable, total_payments }
}

export const customers = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.customers.filter(c => c.is_active)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(c =>
        c.customer_name?.toLowerCase().includes(s) ||
        c.business_name?.toLowerCase().includes(s) ||
        c.mobile?.includes(s) ||
        c.city?.toLowerCase().includes(s)
      )
    }
    if (filters.city) rows = rows.filter(c => c.city === filters.city)
    rows = rows.map(c => customerWithStats(c, db))
    rows.sort((a, b) => a.customer_name.localeCompare(b.customer_name))
    if (filters.limit) rows = rows.slice(0, parseInt(filters.limit))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    const c = db.customers.find(c => c.id === id)
    return c ? ok(customerWithStats(c, db)) : err('Not found')
  },
  search(q) {
    const db = load()
    const s = q.toLowerCase()
    const rows = db.customers.filter(c => c.is_active && (
      c.customer_name?.toLowerCase().includes(s) ||
      c.business_name?.toLowerCase().includes(s) ||
      c.mobile?.includes(s)
    )).slice(0, 20)
    return ok(rows)
  },
  create(data) {
    const db = load()
    const id = nextId('customers')
    db.customers.push({ id, ...data, is_active: 1, created_at: now(), updated_at: now() })
    save(db); return ok(id)
  },
  update(data) {
    const db = load()
    const idx = db.customers.findIndex(c => c.id === data.id)
    if (idx < 0) return err('Not found')
    db.customers[idx] = { ...db.customers[idx], ...data, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    const c = db.customers.find(c => c.id === id)
    if (c) { c.is_active = 0; c.updated_at = now(); save(db) }
    return ok(true)
  }
}


// ── TRANSACTIONS ──────────────────────────────────────────────────────────────

export const transactions = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.transactions.map(t => {
      const c = db.customers.find(c => c.id === t.customer_id)
      return { ...t, customer_name: c?.customer_name, business_name: c?.business_name }
    })
    if (filters.customerId) rows = rows.filter(t => t.customer_id === parseInt(filters.customerId))
    if (filters.type) rows = rows.filter(t => t.transaction_type === filters.type)
    if (filters.from) rows = rows.filter(t => t.transaction_date >= filters.from)
    if (filters.to) rows = rows.filter(t => t.transaction_date <= filters.to)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(t =>
        t.customer_name?.toLowerCase().includes(s) ||
        t.transaction_id?.toLowerCase().includes(s) ||
        t.remarks?.toLowerCase().includes(s)
      )
    }
    rows.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id - a.id)
    if (filters.limit) rows = rows.slice(0, parseInt(filters.limit))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    const t = db.transactions.find(t => t.id === id)
    if (!t) return err('Not found')
    const c = db.customers.find(c => c.id === t.customer_id)
    return ok({ ...t, customer_name: c?.customer_name })
  },
  create(data) {
    const db = load()
    const id = nextId('transactions')
    const txnId = generateTxnId()
    let recoverable = 0, balance = 0
    if (data.transaction_type === 'silver_issued') {
      recoverable = (data.gross_silver_given || 0) * (data.purity_percentage || 0) / 100
      const wastage = data.wastage_percentage || 0
      balance = recoverable * (1 - wastage / 100)
    } else if (data.transaction_type === 'fine_received') {
      balance = -(data.fine_silver_received || 0)
    } else if (data.transaction_type === 'adjustment') {
      balance = data.balance_fine_silver || 0
    }
    // Making charges
    const mcRate   = parseFloat(data.making_charges) || 0
    const mcType   = data.making_charges_type || 'fixed'
    const mcAmount = mcType === 'per_gram'
      ? parseFloat((mcRate * (parseFloat(data.gross_silver_given) || 0)).toFixed(2))
      : mcRate

    db.transactions.push({
      id, transaction_id: txnId,
      transaction_date: data.transaction_date,
      customer_id: parseInt(data.customer_id),
      transaction_type: data.transaction_type,
      gross_silver_given: data.gross_silver_given || 0,
      fine_silver_received: data.fine_silver_received || 0,
      purity_percentage: data.purity_percentage || 0,
      recoverable_fine_silver: recoverable,
      wastage_percentage: data.wastage_percentage || 0,
      balance_fine_silver: data.balance_fine_silver !== undefined ? parseFloat(data.balance_fine_silver) : balance,
      payment_amount: data.payment_amount || 0,
      making_charges: mcAmount,
      making_charges_type: mcType,
      remarks: data.remarks || '',
      created_by: data.created_by || 1, created_at: now(), updated_at: now()
    })
    save(db)
    return { success: true, id, transaction_id: txnId }
  },
  update(data) {
    const db = load()
    const idx = db.transactions.findIndex(t => t.id === data.id)
    if (idx < 0) return err('Not found')
    let recoverable = data.recoverable_fine_silver || 0
    if (data.transaction_type === 'silver_issued') {
      recoverable = (data.gross_silver_given || 0) * (data.purity_percentage || 0) / 100
    }
    db.transactions[idx] = { ...db.transactions[idx], ...data, recoverable_fine_silver: recoverable, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    db.transactions = db.transactions.filter(t => t.id !== id)
    save(db); return ok(true)
  },
  getLedger(customerId) {
    const db = load()
    const txns = db.transactions
      .filter(t => t.customer_id === parseInt(customerId))
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || a.id - b.id)
    let running = 0
    const ledger = txns.map(t => {
      if (t.transaction_type === 'silver_issued') running += t.recoverable_fine_silver
      else if (t.transaction_type === 'fine_received') running -= t.fine_silver_received
      else if (t.transaction_type === 'adjustment') running += t.balance_fine_silver
      return { ...t, running_balance: running }
    })
    return ok(ledger)
  },
  getSummary() {
    const db = load()
    const txns = db.transactions
    const total_issued = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.gross_silver_given || 0), 0)
    const total_received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
    const total_recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
    const total_pending = total_recoverable - total_received
    const total_making_charges = txns.reduce((s, t) => s + (t.making_charges || 0), 0)
    return ok({ total_issued, total_received, total_recoverable, total_pending, total_fine_back: total_received, total_making_charges })
  }
}


// ── EMPLOYEES ─────────────────────────────────────────────────────────────────

export const employees = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.employees
    if (filters.activeOnly) rows = rows.filter(e => e.is_active)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(e =>
        e.employee_name?.toLowerCase().includes(s) ||
        e.mobile?.includes(s) ||
        e.designation?.toLowerCase().includes(s)
      )
    }
    rows = rows.map(e => {
      const delivs = db.deliveries.filter(d => d.employee_id === e.id)
      const cities = new Set(delivs.map(d => d.destination_city).filter(Boolean))
      return { ...e, delivery_count: delivs.length, cities_visited: cities.size }
    })
    rows.sort((a, b) => a.employee_name.localeCompare(b.employee_name))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    return ok(db.employees.find(e => e.id === id) || null)
  },
  getStats(id) {
    const db = load()
    const delivs = db.deliveries.filter(d => d.employee_id === id)
    const cities = new Set(delivs.map(d => d.destination_city).filter(Boolean))
    const stats = {
      total_deliveries: delivs.length,
      cities_visited: cities.size,
      total_silver_delivered: delivs.reduce((s, d) => s + (d.silver_weight_delivered || 0), 0),
      total_fine_collected: delivs.reduce((s, d) => s + (d.fine_silver_collected || 0), 0),
      total_expenses: delivs.reduce((s, d) => s + (d.travel_expenses || 0), 0),
    }
    const recent_deliveries = delivs.slice(-10).reverse().map(d => {
      const c = db.customers.find(c => c.id === d.customer_id)
      return { ...d, customer_name: c?.customer_name }
    })
    return ok({ stats, recent_deliveries })
  },
  create(data) {
    const db = load()
    const id = nextId('employees')
    db.employees.push({ id, ...data, created_at: now(), updated_at: now() })
    save(db); return ok(id)
  },
  update(data) {
    const db = load()
    const idx = db.employees.findIndex(e => e.id === data.id)
    if (idx < 0) return err('Not found')
    db.employees[idx] = { ...db.employees[idx], ...data, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    const e = db.employees.find(e => e.id === id)
    if (e) { e.is_active = 0; e.updated_at = now(); save(db) }
    return ok(true)
  }
}

// ── DELIVERIES ────────────────────────────────────────────────────────────────

export const deliveries = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.deliveries.map(d => {
      const c = db.customers.find(c => c.id === d.customer_id)
      const e = db.employees.find(e => e.id === d.employee_id)
      return { ...d, customer_name: c?.customer_name, business_name: c?.business_name, employee_name: e?.employee_name }
    })
    if (filters.customerId) rows = rows.filter(d => d.customer_id === parseInt(filters.customerId))
    if (filters.employeeId) rows = rows.filter(d => d.employee_id === parseInt(filters.employeeId))
    if (filters.city) rows = rows.filter(d => d.destination_city?.toLowerCase().includes(filters.city.toLowerCase()))
    if (filters.from) rows = rows.filter(d => d.delivery_date >= filters.from)
    if (filters.to) rows = rows.filter(d => d.delivery_date <= filters.to)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(d =>
        d.customer_name?.toLowerCase().includes(s) ||
        d.employee_name?.toLowerCase().includes(s) ||
        d.destination_city?.toLowerCase().includes(s) ||
        d.purpose?.toLowerCase().includes(s)
      )
    }
    rows.sort((a, b) => b.delivery_date.localeCompare(a.delivery_date) || b.id - a.id)
    if (filters.limit) rows = rows.slice(0, parseInt(filters.limit))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    const d = db.deliveries.find(d => d.id === id)
    if (!d) return err('Not found')
    const c = db.customers.find(c => c.id === d.customer_id)
    const e = db.employees.find(e => e.id === d.employee_id)
    return ok({ ...d, customer_name: c?.customer_name, employee_name: e?.employee_name })
  },
  create(data) {
    const db = load()
    const id = nextId('deliveries')
    db.deliveries.push({
      id, ...data,
      customer_id: data.customer_id ? parseInt(data.customer_id) : null,
      employee_id: data.employee_id ? parseInt(data.employee_id) : null,
      silver_weight_delivered: data.silver_weight_delivered || 0,
      fine_silver_collected: data.fine_silver_collected || 0,
      travel_expenses: data.travel_expenses || 0,
      created_at: now(), updated_at: now()
    })
    save(db); return ok(id)
  },
  update(data) {
    const db = load()
    const idx = db.deliveries.findIndex(d => d.id === data.id)
    if (idx < 0) return err('Not found')
    db.deliveries[idx] = { ...db.deliveries[idx], ...data, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    db.deliveries = db.deliveries.filter(d => d.id !== id)
    save(db); return ok(true)
  }
}


// ── PAYMENTS ──────────────────────────────────────────────────────────────────

export const payments = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.payments.map(p => {
      const c = db.customers.find(c => c.id === p.customer_id)
      return { ...p, customer_name: c?.customer_name, business_name: c?.business_name }
    })
    if (filters.customerId) rows = rows.filter(p => p.customer_id === parseInt(filters.customerId))
    if (filters.method) rows = rows.filter(p => p.payment_method === filters.method)
    if (filters.from) rows = rows.filter(p => p.payment_date >= filters.from)
    if (filters.to) rows = rows.filter(p => p.payment_date <= filters.to)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(p =>
        p.customer_name?.toLowerCase().includes(s) ||
        p.reference_number?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s)
      )
    }
    rows.sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.id - a.id)
    if (filters.limit) rows = rows.slice(0, parseInt(filters.limit))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    const p = db.payments.find(p => p.id === id)
    if (!p) return err('Not found')
    const c = db.customers.find(c => c.id === p.customer_id)
    return ok({ ...p, customer_name: c?.customer_name })
  },
  create(data) {
    const db = load()
    const id = nextId('payments')
    db.payments.push({
      id, ...data,
      customer_id: parseInt(data.customer_id),
      payment_amount: parseFloat(data.payment_amount),
      created_at: now(), updated_at: now()
    })
    save(db); return ok(id)
  },
  update(data) {
    const db = load()
    const idx = db.payments.findIndex(p => p.id === data.id)
    if (idx < 0) return err('Not found')
    db.payments[idx] = { ...db.payments[idx], ...data, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    db.payments = db.payments.filter(p => p.id !== id)
    save(db); return ok(true)
  },
  getCustomerSummary(customerId) {
    const db = load()
    const history = db.payments.filter(p => p.customer_id === parseInt(customerId))
    const total_paid = history.reduce((s, p) => s + (p.payment_amount || 0), 0)
    return ok({ summary: { total_paid, payment_count: history.length }, history })
  }
}

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────

export const documents = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.documents.map(d => {
      const c = db.customers.find(c => c.id === d.customer_id)
      return { ...d, customer_name: c?.customer_name }
    })
    if (filters.customerId) rows = rows.filter(d => d.customer_id === parseInt(filters.customerId))
    if (filters.category) rows = rows.filter(d => d.document_category === filters.category)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(d => d.document_name?.toLowerCase().includes(s) || d.original_filename?.toLowerCase().includes(s))
    }
    rows.sort((a, b) => b.created_at?.localeCompare(a.created_at))
    return ok(rows)
  },
  upload(data) {
    const db = load()
    const id = nextId('documents')
    const ext = (data.original_filename || '').split('.').pop().toUpperCase()
    db.documents.push({
      id, document_name: data.document_name || data.original_filename,
      original_filename: data.original_filename || 'file.pdf',
      stored_filename: `${uuidv4()}.${ext.toLowerCase()}`,
      file_type: ext, file_size: data.file_size || 102400,
      document_category: data.document_category || 'Other',
      customer_id: data.customer_id ? parseInt(data.customer_id) : null,
      transaction_id: data.transaction_id || null,
      notes: data.notes || '', uploaded_by: data.uploaded_by || 1,
      created_at: now()
    })
    save(db); return ok(id)
  },
  open(id) { return ok(true) },
  download(id) { return ok(true) },
  delete(id) {
    const db = load()
    db.documents = db.documents.filter(d => d.id !== id)
    save(db); return ok(true)
  }
}


// ── DASHBOARD ─────────────────────────────────────────────────────────────────

export const dashboard = {
  getStats() {
    const db = load()
    const txns = db.transactions
    const total_silver_issued = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.gross_silver_given || 0), 0)
    const total_fine_received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
    const total_recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
    const total_payments = db.payments.reduce((s, p) => s + (p.payment_amount || 0), 0)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const deliveries_this_month = db.deliveries.filter(d => d.delivery_date?.startsWith(thisMonth)).length
    return ok({
      total_silver_issued, total_fine_received,
      total_pending_fine: total_recoverable - total_fine_received,
      total_payments, deliveries_this_month,
      total_customers: db.customers.filter(c => c.is_active).length,
      total_transactions: txns.length
    })
  },
  getMonthlyMovement() {
    const db = load()
    const map = {}
    db.transactions.forEach(t => {
      const m = t.transaction_date?.slice(0, 7)
      if (!m) return
      if (!map[m]) map[m] = { month: m, issued: 0, received: 0 }
      if (t.transaction_type === 'silver_issued') map[m].issued += t.gross_silver_given || 0
      if (t.transaction_type === 'fine_received') map[m].received += t.fine_silver_received || 0
    })
    return ok(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12))
  },
  getCustomerBalances() {
    const db = load()
    const result = db.customers.filter(c => c.is_active).map(c => {
      const txns = db.transactions.filter(t => t.customer_id === c.id)
      const recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
      const received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
      return { customer_name: c.customer_name, balance: recoverable - received }
    }).filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 10)
    return ok(result)
  },
  getPaymentTrends() {
    const db = load()
    const map = {}
    db.payments.forEach(p => {
      const m = p.payment_date?.slice(0, 7)
      if (!m) return
      if (!map[m]) map[m] = { month: m, amount: 0, count: 0 }
      map[m].amount += p.payment_amount || 0
      map[m].count++
    })
    return ok(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12))
  },
  getRecentTransactions() {
    const db = load()
    return ok(db.transactions.slice(-10).reverse().map(t => {
      const c = db.customers.find(c => c.id === t.customer_id)
      return { ...t, customer_name: c?.customer_name }
    }))
  },
  getTopPending() {
    const db = load()
    const result = db.customers.filter(c => c.is_active).map(c => {
      const txns = db.transactions.filter(t => t.customer_id === c.id)
      const recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
      const received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
      return { ...c, pending_fine: recoverable - received }
    }).filter(r => r.pending_fine > 0).sort((a, b) => b.pending_fine - a.pending_fine).slice(0, 8)
    return ok(result)
  }
}

// ── REPORTS ───────────────────────────────────────────────────────────────────

export const reports = {
  customerLedger({ customerId, from, to }) {
    const db = load()
    const customer = db.customers.find(c => c.id === parseInt(customerId))
    let txns = db.transactions.filter(t => t.customer_id === parseInt(customerId))
    if (from) txns = txns.filter(t => t.transaction_date >= from)
    if (to) txns = txns.filter(t => t.transaction_date <= to)
    txns.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    let running = 0
    const ledger = txns.map(t => {
      if (t.transaction_type === 'silver_issued') running += t.recoverable_fine_silver
      else if (t.transaction_type === 'fine_received') running -= t.fine_silver_received
      else if (t.transaction_type === 'adjustment') running += t.balance_fine_silver
      return { ...t, running_balance: running }
    })
    return ok({ customer, ledger })
  },
  silverStatement({ from, to }) {
    const db = load()
    let rows = db.transactions.map(t => {
      const c = db.customers.find(c => c.id === t.customer_id)
      return { ...t, customer_name: c?.customer_name }
    })
    if (from) rows = rows.filter(t => t.transaction_date >= from)
    if (to) rows = rows.filter(t => t.transaction_date <= to)
    return ok(rows.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)))
  },
  deliveryReport(filters) {
    const db = load()
    let rows = db.deliveries.map(d => {
      const c = db.customers.find(c => c.id === d.customer_id)
      const e = db.employees.find(e => e.id === d.employee_id)
      return { ...d, customer_name: c?.customer_name, employee_name: e?.employee_name }
    })
    if (filters.from) rows = rows.filter(d => d.delivery_date >= filters.from)
    if (filters.to) rows = rows.filter(d => d.delivery_date <= filters.to)
    if (filters.customerId) rows = rows.filter(d => d.customer_id === parseInt(filters.customerId))
    if (filters.employeeId) rows = rows.filter(d => d.employee_id === parseInt(filters.employeeId))
    return ok(rows.sort((a, b) => b.delivery_date.localeCompare(a.delivery_date)))
  },
  pendingBalance() {
    const db = load()
    const result = db.customers.filter(c => c.is_active).map(c => {
      const txns = db.transactions.filter(t => t.customer_id === c.id)
      const total_recoverable = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.recoverable_fine_silver || 0), 0)
      const total_fine_received = txns.filter(t => t.transaction_type === 'fine_received').reduce((s, t) => s + (t.fine_silver_received || 0), 0)
      const total_gross_issued = txns.filter(t => t.transaction_type === 'silver_issued').reduce((s, t) => s + (t.gross_silver_given || 0), 0)
      return { ...c, total_recoverable, total_fine_received, total_gross_issued, pending_fine: total_recoverable - total_fine_received }
    })
    return ok(result.sort((a, b) => a.customer_name.localeCompare(b.customer_name)))
  },
  paymentHistory(filters) {
    const db = load()
    let rows = db.payments.map(p => {
      const c = db.customers.find(c => c.id === p.customer_id)
      return { ...p, customer_name: c?.customer_name, business_name: c?.business_name }
    })
    if (filters.from) rows = rows.filter(p => p.payment_date >= filters.from)
    if (filters.to) rows = rows.filter(p => p.payment_date <= filters.to)
    if (filters.customerId) rows = rows.filter(p => p.customer_id === parseInt(filters.customerId))
    if (filters.method) rows = rows.filter(p => p.payment_method === filters.method)
    return ok(rows.sort((a, b) => b.payment_date.localeCompare(a.payment_date)))
  },
  exportExcel({ type, data, filename }) {
    // In preview mode: just show a toast — real export needs Electron
    return ok({ path: `~/Downloads/${filename}`, preview: true })
  },
  exportCSV({ data, filename }) {
    return ok({ path: `~/Downloads/${filename}`, preview: true })
  }
}

// ── BACKUP ────────────────────────────────────────────────────────────────────

export const backup = {
  create() {
    const db = load()
    const size = JSON.stringify(db).length
    const name = `goddest_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.zip`
    const backups = JSON.parse(localStorage.getItem('gm_backups') || '[]')
    const entry = { name, path: `/backups/${name}`, size, created: new Date().toISOString() }
    backups.unshift(entry)
    localStorage.setItem('gm_backups', JSON.stringify(backups.slice(0, 20)))
    // snapshot data
    localStorage.setItem(`gm_backup_${name}`, JSON.stringify(db))
    return ok(entry)
  },
  restore(filePath) {
    // In preview we can't restore from a zip — show message
    return ok({ message: 'Restore complete. Please restart the application.' })
  },
  list() {
    const backups = JSON.parse(localStorage.getItem('gm_backups') || '[]')
    return ok(backups)
  }
}


// ── GENERAL ACCOUNTS ──────────────────────────────────────────────────────────

export const accounts = {
  getAll(filters = {}) {
    const db = load()
    let rows = db.general_accounts || []
    if (filters.type)   rows = rows.filter(r => r.entry_type === filters.type)
    if (filters.from)   rows = rows.filter(r => r.entry_date >= filters.from)
    if (filters.to)     rows = rows.filter(r => r.entry_date <= filters.to)
    if (filters.search) {
      const s = filters.search.toLowerCase()
      rows = rows.filter(r =>
        r.party_name?.toLowerCase().includes(s) ||
        r.description?.toLowerCase().includes(s) ||
        r.category?.toLowerCase().includes(s) ||
        r.reference_number?.toLowerCase().includes(s)
      )
    }
    rows = [...rows].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.id - a.id)
    if (filters.limit) rows = rows.slice(0, parseInt(filters.limit))
    return ok(rows)
  },
  getOne(id) {
    const db = load()
    return ok((db.general_accounts || []).find(r => r.id === id))
  },
  create(data) {
    const db = load()
    if (!db.general_accounts) db.general_accounts = []
    const id = db.general_accounts.length ? Math.max(...db.general_accounts.map(r => r.id)) + 1 : 1
    db.general_accounts.push({ id, ...data, created_at: now(), updated_at: now() })
    save(db); return ok(id)
  },
  update(data) {
    const db = load()
    if (!db.general_accounts) db.general_accounts = []
    const idx = db.general_accounts.findIndex(r => r.id === data.id)
    if (idx >= 0) db.general_accounts[idx] = { ...db.general_accounts[idx], ...data, updated_at: now() }
    save(db); return ok(true)
  },
  delete(id) {
    const db = load()
    db.general_accounts = (db.general_accounts || []).filter(r => r.id !== id)
    save(db); return ok(true)
  },
  getSummary(filters = {}) {
    const db = load()
    let rows = db.general_accounts || []
    if (filters.from) rows = rows.filter(r => r.entry_date >= filters.from)
    if (filters.to)   rows = rows.filter(r => r.entry_date <= filters.to)
    const sum = (type) => rows.filter(r => r.entry_type === type).reduce((s, r) => s + (r.amount || 0), 0)
    const sumW = (type) => rows.filter(r => r.entry_type === type).reduce((s, r) => s + (r.silver_weight || 0), 0)
    const total_income = sum('income'), total_expense = sum('expense')
    const total_silver_purchase = sum('silver_purchase'), total_silver_sale = sum('silver_sale')
    const total_bank_deposit = sum('bank_deposit'), total_bank_withdrawal = sum('bank_withdrawal')
    const net_cashflow = (total_income + total_silver_sale + total_bank_withdrawal)
                       - (total_expense + total_silver_purchase + total_bank_deposit)
    return ok({
      total_income, total_expense, total_silver_purchase, total_silver_sale,
      total_bank_deposit, total_bank_withdrawal,
      total_silver_bought_g: sumW('silver_purchase'), total_silver_sold_g: sumW('silver_sale'),
      net_cashflow
    })
  },
  getMonthly() {
    const db = load()
    const rows = db.general_accounts || []
    const map = {}
    rows.forEach(r => {
      const m = r.entry_date?.slice(0, 7); if (!m) return
      if (!map[m]) map[m] = { month: m, income: 0, expense: 0, silver_purchase: 0, silver_sale: 0 }
      if (r.entry_type === 'income')          map[m].income          += r.amount || 0
      if (r.entry_type === 'expense')         map[m].expense         += r.amount || 0
      if (r.entry_type === 'silver_purchase') map[m].silver_purchase += r.amount || 0
      if (r.entry_type === 'silver_sale')     map[m].silver_sale     += r.amount || 0
    })
    return ok(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12))
  }
}
