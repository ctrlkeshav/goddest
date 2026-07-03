import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtDateTime, formatFileSize } from '../utils/format'

const CATEGORIES = [
  'Bill', 'Invoice', 'Delivery Challan', 'Payment Receipt',
  'GST Document', 'Customer Agreement', 'Transport Document', 'Bank Proof', 'Other'
]

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.xlsx'

const catIcon = { 'Bill': '🧾', 'Invoice': '📋', 'Delivery Challan': '📦', 'Payment Receipt': '💳', 'GST Document': '📄', 'Customer Agreement': '📝', 'Transport Document': '🚛', 'Bank Proof': '🏦', 'Other': '📁' }
const fileIcon = { PDF: '📕', JPG: '🖼', JPEG: '🖼', PNG: '🖼', DOCX: '📘', XLSX: '📗' }

export default function DocumentsPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ document_name: '', document_category: 'Invoice', customer_id: '', notes: '', source_path: '', original_filename: '' })
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', category: '', customerId: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getDocuments(filters)
    if (res.success) setDocs(res.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { window.api.getCustomers({}).then(r => r.success && setCustomers(r.data)) }, [])

  const handleBrowse = async () => {
    const result = await window.api.openFileDialog({
      title: 'Select Document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths[0]) {
      const fp = result.filePaths[0]
      const fname = fp.split(/[\\/]/).pop()
      setForm(p => ({
        ...p,
        source_path: fp,
        original_filename: fname,
        document_name: p.document_name || fname
      }))
    }
  }

  const handleUpload = async () => {
    if (!form.source_path) return toast.error('Please select a file')
    if (!form.document_category) return toast.error('Select a category')
    const res = await window.api.uploadDocument(form)
    if (res.success) {
      toast.success('Document uploaded')
      setModal(false)
      setForm({ document_name: '', document_category: 'Invoice', customer_id: '', notes: '', source_path: '', original_filename: '' })
      load()
    } else toast.error(res.error || 'Upload failed')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteDocument(id)
    if (res.success) { toast.success('Document deleted'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const totalSize = docs.reduce((s, d) => s + (d.file_size || 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📁 Document Management</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {docs.length} files · {formatFileSize(totalSize)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Upload Document</button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Category summary */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const count = docs.filter(d => d.document_category === cat).length
            if (!count) return null
            return (
              <button key={cat}
                className={`btn btn-sm ${filters.category === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setF('category', filters.category === cat ? '' : cat)}>
                {catIcon[cat] || '📄'} {cat} ({count})
              </button>
            )
          })}
          {filters.category && <button className="btn btn-ghost btn-sm" onClick={() => setF('category', '')}>✕ Clear</button>}
        </div>

        <div className="filter-row">
          <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search by name, filename…" />
          <select className="select" style={{ width: 180 }} value={filters.customerId} onChange={e => setF('customerId', e.target.value)}>
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
          </select>
        </div>

        {/* Document Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {loading && <div className="loading">Loading…</div>}
          {!loading && docs.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state"><div className="icon">📁</div>No documents uploaded yet</div>
            </div>
          )}
          {docs.map(d => (
            <div key={d.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{fileIcon[d.file_type] || '📄'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-all' }}>{d.document_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{d.original_filename}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-blue">{catIcon[d.document_category]} {d.document_category}</span>
                <span className="badge badge-gray">{d.file_type}</span>
              </div>

              {d.customer_name && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>👤 {d.customer_name}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                <span>{formatFileSize(d.file_size)}</span>
                <span>{fmtDate(d.created_at)}</span>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                  onClick={() => window.api.openDocument(d.id).catch(() => toast.error('Could not open file'))}>
                  👁 Open
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(d.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title="Upload Document"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!form.source_path}>Upload</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File selector */}
          <div className="form-group">
            <label className="form-label">Select File * (PDF, JPG, PNG, DOCX, XLSX)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" readOnly value={form.original_filename || ''} placeholder="No file selected" style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={handleBrowse}>Browse…</button>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document Name</label>
              <input className="input" value={form.document_name} onChange={e => set('document_name', e.target.value)} placeholder="Friendly name" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="select" value={form.document_category} onChange={e => set('document_category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catIcon[c]} {c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link to Customer</label>
            <select className="select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
              <option value="">— Optional —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes" rows={2} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Document" message="This will permanently delete the file. This cannot be undone." danger />
    </div>
  )
}
