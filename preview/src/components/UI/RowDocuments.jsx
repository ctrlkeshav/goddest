/**
 * RowDocuments — inline document attachment panel for any table row.
 *
 * Props:
 *   linkKey  — "transaction_id" | "account_id" | "delivery_id" | "payment_id"
 *   linkId   — the record's numeric id
 *   userId   — uploader id (from auth context)
 *   label    — optional row label shown in panel header (e.g. "TXN240710001")
 */

import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { fmtDate, formatFileSize } from '../../utils/format'

const CATEGORIES = [
  'Bill', 'Invoice', 'Delivery Challan', 'Payment Receipt',
  'GST Document', 'Bank Proof', 'Transport Document', 'Other'
]

const fileIcon = (type) => {
  const t = (type || '').toUpperCase()
  if (t === 'PDF')                       return '📕'
  if (['JPG','JPEG','PNG'].includes(t))  return '🖼️'
  if (t === 'DOCX')                      return '📘'
  if (t === 'XLSX')                      return '📗'
  return '📄'
}

export default function RowDocuments({ linkKey, linkId, userId, label }) {
  const [open,      setOpen]      = useState(false)
  const [docs,      setDocs]      = useState([])
  const [count,     setCount]     = useState(0)   // loaded on mount for badge
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [category,  setCategory]  = useState('Bill')
  const [docName,   setDocName]   = useState('')
  const fileInputRef = useRef(null)

  // Load count on mount so badge is accurate immediately
  useEffect(() => {
    if (!linkId) return
    window.api.getDocuments({ [linkKey]: linkId })
      .then(r => { if (r.success) { setCount(r.data.length); setDocs(r.data) } })
      .catch(() => {})
  }, [linkKey, linkId])

  const loadDocs = async () => {
    if (!linkId) return
    setLoading(true)
    const res = await window.api.getDocuments({ [linkKey]: linkId })
    if (res.success) { setDocs(res.data); setCount(res.data.length) }
    setLoading(false)
  }

  const handleOpen = () => {
    setOpen(true)
    loadDocs()
  }

  // ── File picker ────────────────────────────────────────────────────────────
  const handleBrowse = async () => {
    if (window.api?.openFileDialog) {
      const result = await window.api.openFileDialog({
        title: 'Attach Document',
        filters: [{ name: 'Documents', extensions: ['pdf','jpg','jpeg','png','docx','xlsx'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths?.[0]) return
      const fp = result.filePaths[0]
      await uploadFile(fp, fp.split(/[\\/]/).pop())
    } else {
      // Browser preview fallback
      fileInputRef.current?.click()
    }
  }

  const handleFileInput = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file.name, file.name)
    e.target.value = ''
  }

  const uploadFile = async (sourcePath, originalName) => {
    if (!linkId) {
      toast.error('Save the record first before attaching documents')
      return
    }
    setUploading(true)
    const res = await window.api.uploadDocument({
      source_path:       sourcePath,
      original_filename: originalName,
      document_name:     docName.trim() || originalName,
      document_category: category,
      [linkKey]:         linkId,
      uploaded_by:       userId || null,
      notes:             ''
    })
    setUploading(false)
    if (res.success) {
      toast.success('Document attached')
      setDocName('')
      loadDocs()
    } else {
      toast.error(res.error || 'Upload failed')
    }
  }

  const handleOpenDoc = (doc) => {
    if (window.api?.openDocument) {
      window.api.openDocument(doc.id)
        .catch(() => toast.error('Could not open file'))
    } else {
      toast('File preview only available in desktop app', { icon: 'ℹ️' })
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteDocument(id)
    if (res.success) { toast.success('Document removed'); loadDocs() }
    else toast.error(res.error)
  }

  return (
    <div style={{ display: 'inline-block', position: 'relative' }}>

      {/* ── Trigger button with badge ──────────────────────────────────────── */}
      <button
        className="btn btn-ghost btn-sm btn-icon"
        title={count > 0 ? `${count} document${count > 1 ? 's' : ''} attached` : 'Attach documents'}
        onClick={handleOpen}
        style={{ position: 'relative' }}
      >
        📎
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: 'var(--accent)', color: '#000',
            borderRadius: '50%', minWidth: 16, height: 16,
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
          }}>
            {count}
          </span>
        )}
      </button>

      {/* Hidden file input for browser */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* ── Document Panel ─────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1998, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              zIndex: 1999,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
              background: 'var(--bg-secondary)'
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', marginBottom: 2 }}>📎 Attached Documents</h3>
                {label && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{label}</span>
                )}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} style={{ fontSize: 18 }}>✕</button>
            </div>

            {/* Upload section */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attach New Document
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  className="select"
                  style={{ width: 160, flexShrink: 0 }}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="Document name (optional)"
                  onKeyDown={e => { if (e.key === 'Enter') handleBrowse() }}
                />
              </div>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={handleBrowse}
                disabled={uploading}
              >
                {uploading
                  ? '⏳ Uploading…'
                  : '📂  Browse & Attach   (PDF · JPG · PNG · DOCX · XLSX)'}
              </button>
            </div>

            {/* Document list — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {loading && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</div>
              )}

              {!loading && docs.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                  <p style={{ fontSize: 13 }}>No documents attached yet</p>
                  <p style={{ fontSize: 11, marginTop: 4 }}>Use the Browse button above to attach files</p>
                </div>
              )}

              {docs.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  transition: 'var(--transition)'
                }}>
                  {/* File type icon */}
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{fileIcon(d.file_type)}</span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.document_name}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 999,
                        background: 'var(--accent-muted)', color: 'var(--accent)'
                      }}>
                        {d.document_category}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.file_type}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatFileSize(d.file_size)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(d.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenDoc(d)}
                      title="Open in default app"
                    >
                      👁 Open
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleDelete(d.id)}
                      title="Remove document"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            {docs.length > 0 && (
              <div style={{
                padding: '10px 20px',
                borderTop: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                flexShrink: 0
              }}>
                {docs.length} file{docs.length > 1 ? 's' : ''} attached to this record
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
