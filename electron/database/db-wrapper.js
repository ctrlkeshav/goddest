/**
 * db-wrapper.js
 *
 * Pure-JavaScript SQLite — no native C++ compilation.
 * Works with any Node.js version and any Electron version.
 *
 * IMPORTANT: Call Database.initialize() once before creating any Database
 * instance (it returns a Promise). After that all operations are synchronous.
 *
 * API mirrors better-sqlite3:
 *   await Database.initialize()      — call once at app startup
 *   const db = new Database(path)    — open or create a database file
 *   db.prepare(sql).get(...params)   — fetch one row
 *   db.prepare(sql).all(...params)   — fetch all rows
 *   db.prepare(sql).run(...params)   — insert / update / delete
 *   db.exec(sql)                     — run multi-statement DDL
 *   db.pragma()                      — no-op stub
 *   db.saveToDisk()                  — flush in-memory DB to .db file
 *   db.close()                       — flush + release memory
 */

'use strict'

const fs   = require('fs')
const path = require('path')

let _SQL = null   // sql.js constructor, set once by initialize()

// ── One-time async initialisation ────────────────────────────────────────────
Database.initialize = async function () {
  if (_SQL) return   // already done

  const initSqlJs = require('sql.js')

  // Find the WASM binary that ships alongside sql.js
  const sqlJsDir  = path.dirname(require.resolve('sql.js'))
  const wasmCandidates = [
    path.join(sqlJsDir, 'sql-wasm.wasm'),
    path.join(sqlJsDir, '..', 'dist', 'sql-wasm.wasm'),
    path.join(sqlJsDir, 'dist',       'sql-wasm.wasm'),
  ]
  let wasmPath = null
  for (const c of wasmCandidates) {
    if (fs.existsSync(c)) { wasmPath = c; break }
  }
  if (!wasmPath) {
    throw new Error(
      'sql.js WASM file not found. Searched:\n' + wasmCandidates.join('\n')
    )
  }

  const wasmBinary = fs.readFileSync(wasmPath)
  _SQL = await initSqlJs({ wasmBinary })
  console.log('[db] sql.js initialised successfully')
}

// ── Statement ─────────────────────────────────────────────────────────────────
class Statement {
  constructor (sqlDb, sql) {
    this._db  = sqlDb
    this._sql = sql
  }

  _bind (args) {
    if (args.length === 0) return []
    if (args.length === 1 && Array.isArray(args[0])) return args[0]
    return args
  }

  /** Returns one row as a plain object, or undefined */
  get (...args) {
    const s = this._db.prepare(this._sql)
    try {
      s.bind(this._bind(args))
      return s.step() ? s.getAsObject() : undefined
    } finally {
      s.free()
    }
  }

  /** Returns all matching rows as plain objects */
  all (...args) {
    const s    = this._db.prepare(this._sql)
    const rows = []
    try {
      s.bind(this._bind(args))
      while (s.step()) rows.push(s.getAsObject())
    } finally {
      s.free()
    }
    return rows
  }

  /** Executes a write and returns { changes, lastInsertRowid } */
  run (...args) {
    const s = this._db.prepare(this._sql)
    try {
      s.bind(this._bind(args))
      s.step()
      const changes = this._db.getRowsModified()
      const res     = this._db.exec('SELECT last_insert_rowid()')
      const lastInsertRowid = res?.[0]?.values?.[0]?.[0] ?? 0
      return { changes, lastInsertRowid }
    } finally {
      s.free()
    }
  }
}

// ── Database ──────────────────────────────────────────────────────────────────
function Database (filePath) {
  if (!_SQL) {
    throw new Error(
      'Database.initialize() must be awaited before creating a Database instance.'
    )
  }

  this._filePath = filePath

  if (fs.existsSync(filePath)) {
    const buf = fs.readFileSync(filePath)
    this._db  = new _SQL.Database(buf)
  } else {
    this._db = new _SQL.Database()
  }

  // Auto-flush to disk every 30 seconds
  this._timer = setInterval(() => this.saveToDisk(), 30_000)
  if (this._timer.unref) this._timer.unref()
}

/** Flush the in-memory database to the .db file on disk */
Database.prototype.saveToDisk = function () {
  try {
    const data = this._db.export()
    const tmp  = this._filePath + '.tmp'
    fs.writeFileSync(tmp, Buffer.from(data))
    fs.renameSync(tmp, this._filePath)
  } catch (e) {
    console.error('[db] saveToDisk error:', e.message)
  }
}

/** Returns a Statement bound to this database */
Database.prototype.prepare = function (sql) {
  return new Statement(this._db, sql)
}

/** Execute one or more DDL statements (no params) */
Database.prototype.exec = function (sql) {
  this._db.run(sql)
}

/** Compatibility stub — sql.js doesn't need pragma calls */
Database.prototype.pragma = function () { /* no-op */ }

/** Flush to disk and release WASM memory */
Database.prototype.close = function () {
  clearInterval(this._timer)
  this.saveToDisk()
  this._db.close()
}

module.exports = Database
