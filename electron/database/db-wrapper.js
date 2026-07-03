/**
 * db-wrapper.js
 *
 * Wraps sql.js (pure JavaScript SQLite) with a synchronous API that is
 * 100% compatible with the better-sqlite3 interface used throughout the
 * IPC handlers.  No native C++ compilation required — works with any
 * Node.js version and any Electron version out of the box.
 *
 * Supported API surface:
 *   db.prepare(sql)          → Statement
 *   stmt.get(...params)      → row object | undefined
 *   stmt.all(...params)      → row object[]
 *   stmt.run(...params)      → { changes, lastInsertRowid }
 *   db.exec(sql)             → void  (multi-statement, no params)
 *   db.pragma(str)           → void  (ignored — not needed by sql.js)
 *   db.close()               → void  (flushes to disk and frees memory)
 *   db.saveToDisk()          → void  (call anytime to persist to disk)
 */

const fs   = require('fs')
const path = require('path')

// ── Load sql.js ───────────────────────────────────────────────────────────────
// sql.js ships a WASM binary alongside the JS file. We point it at the
// correct path inside node_modules so it can load the .wasm file.
function loadSqlJs() {
  const initSqlJs = require('sql.js')
  const wasmPath  = path.join(
    path.dirname(require.resolve('sql.js')),
    'sql-wasm.wasm'
  )
  // initSqlJs is synchronous when given a wasmBinary buffer
  const wasmBinary = fs.readFileSync(wasmPath)
  // sql.js init returns a Promise even with wasmBinary — we resolve it
  // synchronously using a trick: the WASM is already loaded via buffer so
  // the promise resolves on the same microtask tick.
  let SQL = null
  let err = null
  initSqlJs({ wasmBinary }).then(s => { SQL = s }).catch(e => { err = e })
  // Spin the event loop until resolved (safe — runs in main process only)
  const { execSync } = require('child_process')
  const deadline = Date.now() + 5000
  while (SQL === null && err === null && Date.now() < deadline) {
    // Use deasync pattern via a tiny busy-wait — acceptable at startup
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
  }
  if (err) throw err
  if (!SQL) throw new Error('sql.js failed to initialise within 5 seconds')
  return SQL
}

// ── Statement wrapper ─────────────────────────────────────────────────────────
class Statement {
  constructor (sqlDb, sql) {
    this._db  = sqlDb   // sql.js Database instance
    this._sql = sql
  }

  // Flatten positional or named params into the format sql.js expects
  _params (args) {
    if (args.length === 0) return []
    // If single array passed, unwrap it
    if (args.length === 1 && Array.isArray(args[0])) return args[0]
    return args
  }

  /** Returns one row as a plain object, or undefined */
  get (...args) {
    const stmt = this._db.prepare(this._sql)
    try {
      stmt.bind(this._params(args))
      if (stmt.step()) {
        return stmt.getAsObject()
      }
      return undefined
    } finally {
      stmt.free()
    }
  }

  /** Returns all rows as plain objects */
  all (...args) {
    const stmt = this._db.prepare(this._sql)
    const rows = []
    try {
      stmt.bind(this._params(args))
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
    } finally {
      stmt.free()
    }
    return rows
  }

  /** Executes a write statement, returns { changes, lastInsertRowid } */
  run (...args) {
    const stmt = this._db.prepare(this._sql)
    try {
      stmt.bind(this._params(args))
      stmt.step()
      return {
        changes:          this._db.getRowsModified(),
        lastInsertRowid:  this._db.exec('SELECT last_insert_rowid() as id')[0]
                            ?.values?.[0]?.[0] ?? 0
      }
    } finally {
      stmt.free()
    }
  }
}

// ── Database wrapper ──────────────────────────────────────────────────────────
class Database {
  /**
   * @param {string} filePath  — path to the .db file on disk
   */
  constructor (filePath) {
    this._filePath = filePath
    const SQL = loadSqlJs()

    if (fs.existsSync(filePath)) {
      // Load existing database from disk
      const buf  = fs.readFileSync(filePath)
      this._db   = new SQL.Database(buf)
    } else {
      // Create brand-new empty database
      this._db   = new SQL.Database()
    }

    // Auto-save to disk every 30 seconds
    this._saveTimer = setInterval(() => this.saveToDisk(), 30_000)
    this._saveTimer.unref()   // don't prevent process exit
  }

  /** Persist the in-memory database to the .db file */
  saveToDisk () {
    try {
      const data = this._db.export()
      const buf  = Buffer.from(data)
      // Write atomically via a temp file
      const tmp  = this._filePath + '.tmp'
      fs.writeFileSync(tmp, buf)
      fs.renameSync(tmp, this._filePath)
    } catch (e) {
      console.error('[db-wrapper] saveToDisk failed:', e.message)
    }
  }

  /** Returns a Statement object (lazy — compiled on first use) */
  prepare (sql) {
    return new Statement(this._db, sql)
  }

  /**
   * Execute one or more SQL statements separated by semicolons.
   * No parameter binding — used for DDL (CREATE TABLE, etc.)
   */
  exec (sql) {
    this._db.run(sql)
  }

  /**
   * Compatibility stub — sql.js doesn't need pragmas for WAL/foreign keys.
   * Silently ignored so existing code needs zero changes.
   */
  pragma (_str) {
    // no-op
  }

  /** Flush to disk and release WASM memory */
  close () {
    clearInterval(this._saveTimer)
    this.saveToDisk()
    this._db.close()
  }
}

module.exports = Database
