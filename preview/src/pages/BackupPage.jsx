import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { fmtDateTime, formatFileSize } from '../utils/format'

export default function BackupPage() {
  const [backups, setBackups] = useState([])
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const loadBackups = async () => {
    const res = await window.api.listBackups()
    if (res.success) setBackups(res.data)
  }

  useEffect(() => { loadBackups() }, [])

  const handleCreate = async () => {
    setCreating(true)
    const res = await window.api.createBackup()
    setCreating(false)
    if (res.success) {
      toast.success(`Backup created: ${formatFileSize(res.size)}`)
      loadBackups()
    } else toast.error(res.error || 'Backup failed')
  }

  const handleRestore = async () => {
    setRestoring(true)
    const res = await window.api.restoreBackup('preview')
    setRestoring(false)
    if (res.success) toast.success(res.message || 'Restore complete')
    else toast.error(res.error || 'Restore failed')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💾 Backup & Restore</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Protect your data</p>
        </div>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ borderColor: 'rgba(16,185,129,0.3)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 36 }}>💾</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 6 }}>Create Backup</h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Creates a compressed ZIP file containing your entire database and all uploaded documents.
                  Store this file in a safe place or external drive.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {['📁 Database (SQLite file)', '📂 All uploaded documents', '🗜 Compressed ZIP format'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--success)', fontSize: 10 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <button className="btn btn-success" onClick={handleCreate} disabled={creating} style={{ width: '100%' }}>
                  {creating ? '⏳ Creating Backup…' : '💾 Create Backup Now'}
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.3)' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 36 }}>🔄</span>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1rem', marginBottom: 6 }}>Restore Backup</h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                  Restore your data from a previously created backup ZIP file.
                  This will replace all current data — use with caution.
                </p>
                <div style={{ padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: 'var(--danger)' }}>
                    ⚠️ Warning: Restoring will overwrite all current data. Create a backup first!
                  </p>
                </div>
                <button className="btn btn-secondary" onClick={handleRestore} disabled={restoring} style={{ width: '100%' }}>
                  {restoring ? '⏳ Restoring…' : '🔄 Restore from Backup'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Data Portability Info */}
        <div className="card" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
          <h2 style={{ fontSize: '0.95rem', marginBottom: 12 }}>📦 Data Portability — Moving to Another PC</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
            To move all your data to another computer, follow these steps:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { step: '1', text: 'Click "Create Backup Now" on this page' },
              { step: '2', text: 'Copy the generated .zip file to a USB drive or external storage' },
              { step: '3', text: 'Install Goddest Metals software on the new PC' },
              { step: '4', text: 'Open the software, go to Backup & Restore, and click "Restore from Backup"' },
              { step: '5', text: 'Select the .zip file — all data will be restored automatically' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-muted)',
                  border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
                }}>{s.step}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 2 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Backup History */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: '0.95rem' }}>📋 Backup History</h2>
            <button className="btn btn-ghost btn-sm" onClick={loadBackups}>↻ Refresh</button>
          </div>

          {backups.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="icon">💾</div>
              <p>No backups created yet. Create your first backup now!</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Filename</th><th>Size</th><th>Created</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {backups.map((b, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🗜</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.name}</span>
                        </div>
                      </td>
                      <td>{formatFileSize(b.size)}</td>
                      <td>{fmtDateTime(b.created)}</td>
                      <td>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          📦 Stored in localStorage
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
