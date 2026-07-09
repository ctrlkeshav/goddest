/**
 * RowDocuments — inline document attachment panel for any table row.
 *
 * Usage:
 *   <RowDocuments
 *     linkKey="account_id"       // which foreign key to use
 *     linkId={entry.id}          // the record's id
 *     userId={user?.id}          // uploader id
 *   />
 *
 * Shows a 📎 button with doc count badge.
 * Clicking opens an inline panel below with upload + list + open actions.
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
  if (t === 'PDF')  return '📕'
  if (['JPG','JPEG','PNG'].includes(t)) return '🖼️'
  if (t === 'DOCX') return '📘'
  if (t === 'XLSX') return '📗'
  return '📄'
}

export default function RowDocuments({ linkKey, linkId, userId }) {
  const [open,     setOpen]     = useState(false)
  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('Bill')
  const [docName,  setDocName]  = useState('')
  const fileInputRef = useRef(null)

  // Load docs whenever panel opens
  useEffect(() => {
    if (open) loadDocs()
  }, [open])

  const loadDocs = async () => {
    setLoading(true)
    const res = await window.api.getDocuments({ [linkKey]: linkId })
    if (res.success) setDocs(res.data)
    setLoading(false)
  }

  // Browse file → upload immediately
  const handleBrowse = async () => {
    // In Electron: use openFileDialog
    if (window.api.openFileDialog) {
      const result = await window.api.openFileDialog({
        title: 'Attach Document',
        filters: [{ name: 'Documents', extensions: ['pdf','jpg','jpeg','png','docx','xlsx'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths?.[0]) return
      await uploadFile(result.filePaths[0], result.filePaths[0].split(/[\\/]/).pop())
    } else {
      // In browser preview: use input[type=file]
      fileInputRef.current?.click()
    }
  }

  const handleFileInput = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    await uploadFile(file.name, file.name, file)
    e.target.value = ''
  }

  const uploadFile = async (sourcePath, originalName, _file) => {
    setUploading(true)
    const res = await window.api.uploadDocument({
      source_path:       sourcePath,
      original_filename: originalName,
      document_name:     docName || originalName,
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

  const handleOpen = (doc) => {
    if (window.api.openDocument) {
      window.api.openDocument(doc.id).catch(() => toast.error('Could not open file'))
    } else {
      toast('File preview only available in desktop app', { icon: 'ℹ️' })
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteDocument(id)
    if (res.success) { toast.success('Removed'); loadDocs() }
    else toast.error(res.error)
  }

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        className="btn btn-ghost btn-sm btn-icon"
        title="Attach / view documents"
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative' }}
      >
        📎
        {docs.length > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent)', color: '#000',
            borderRadius: '50%', width: 14, height: 14,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1
          }}>
            {docs.length}
          </span>
        )}
      </button>

      {/* Hidden file input for browser preview */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />

      {/* Inline panel — rendered as a portal-like absolute box */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            zIndex: 2000,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 480,
            maxHeight: '80vh',
            overflowY: 'auto',
            background: 'var(--bg-modal)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow)',
            padding: 20,
          }}
        >
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setOpen(false)}
          />

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem' }}>📎 Attached Documents</h3>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)} style={{ fontSize: 16 }}>✕</button>
          </div>

          {/* Upload strip */}
          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 8,
            padding: 12, marginBottom: 14,
            display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
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
              />
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleBrowse}
              disabled={uploading}
              style={{ width: '100%' }}
            >
              {uploading ? '⏳ Uploading…' : '📂 Browse & Attach File (PDF, JPG, PNG, DOCX, XLSX)'}
            </button>
          </div>

          {/* Document list */}
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Loading…</div>}

          {!loading && docs.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              No documents attached yet
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map(d => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', background: 'var(--bg-secondary)',
                borderRadius: 6, border: '1px solid var(--border-light)'
              }}>
                {/* Icon */}
                <span style={{ fontSize: 22, flexShrink: 0 }}>{fileIcon(d.file_type)}</span>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.document_name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.document_category}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatFileSize(d.file_size)}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(d.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpen(d)}
                    title="Open / Preview"
                  >
                    👁 Open
                  </button>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={() => handleDelete(d.id)}
                    title="Remove"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
