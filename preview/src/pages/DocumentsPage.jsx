import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, formatFileSize } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  'Bill', 'Invoice', 'Delivery Challan', 'Payment Receipt',
  'GST Document', 'Customer Agreement', 'Transport Document', 'Bank Proof', 'Other'
]

const catIcon = {
  'Bill': '🧾', 'Invoice': '📋', 'Delivery Challan': '📦',
  'Payment Receipt': '💳', 'GST Document': '📄', 'Customer Agreement': '📝',
  'Transport Document': '🚛', 'Bank Proof': '🏦', 'Other': '📁'
}

const fileIcon = { PDF: '📕', JPG: '🖼️', JPEG: '🖼️', PNG: '🖼️', DOCX: '📘', XLSX: '📗' }

const LINK_TYPES = [
  { value: '',            label: '— No link (general document) —' },
  { value: 'customer',    label: '👥 Customer' },
  { value: 'transaction', label: '⚖️ Silver Transaction' },
  { value: 'account',     label: '📒 Account Entry' },
  { value: 'payment',     label: '💳 Payment' },
  { value: 'delivery',    label: '🚚 Delivery' },
]

const EMPTY_FORM = {
  source_path: '', original_filename: '', document_name: '',
  document_category: 'Invoice', notes: '',
  link_type: '',
  customer_id: '', transaction_id: '', account_id: '',
  payment_id: '', delivery_id: ''
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const [docs,       setDocs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters,    setFilters]    = useState({ search: '', category: '' })

  // Reference lists for linking
  const [customers,     setCustomers]     = useState([])
  const [transactions,  setTransactions]  = useState([])
  const [accounts,      setAccounts]      = useState([])
  const [payments,      setPayments]      = useState([])
  const [deliveries,    setDeliveries]    = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getDocuments(filters)
    if (res.success) setDocs(res.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  // Load reference data when modal opens
  useEffect(() => {
    if (!modal) return
    window.api.getCustomers({}).then(r => r.success && setCustomers(r.data))
    window.api.getTransactions({}).then(r => r.success && setTransactions(r.data))
    window.api.getAccounts({}).then(r => r.success && setAccounts(r.data))
    window.api.getPayments({}).then(r => r.success && setPayments(r.data))
    window.api.getDeliveries({}).then(r => r.success && setDeliveries(r.data))
  }, [modal])

  const handleBrowse = async () => {
    if (window.api?.openFileDialog) {
      const result = await window.api.openFileDialog({
        title: 'Select Document',
        filters: [{ name: 'Documents', extensions: ['pdf','jpg','jpeg','png','docx','xlsx'] }],
        properties: ['openFile']
      })
      if (!result.canceled && result.filePaths?.[0]) {
        const fp = result.filePaths[0]
        const fname = fp.split(/[\\/]/).pop()
        setForm(p => ({ ...p, source_path: fp, original_filename: fname, document_name: p.document_name || fname }))
      }
    } else {
      // Browser preview — trigger file input
      document.getElementById('doc-file-input')?.click()
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(p => ({ ...p, source_path: file.name, original_filename: file.name, document_name: p.document_name || file.name }))
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!form.source_path) return toast.error('Please select a file first')
    if (!form.document_category) return toast.error('Select a category')

    const payload = {
      source_path:       form.source_path,
      original_filename: form.original_filename,
      document_name:     form.document_name.trim() || form.original_filename,
      document_category: form.document_category,
      notes:             form.notes,
      uploaded_by:       user?.id || null,
      // Only send the relevant link ID
      customer_id:       form.link_type === 'customer'     ? form.customer_id    : null,
      transaction_id:    form.link_type === 'transaction'  ? form.transaction_id : null,
      account_id:        form.link_type === 'account'      ? form.account_id     : null,
      payment_id:        form.link_type === 'payment'      ? form.payment_id     : null,
      delivery_id:       form.link_type === 'delivery'     ? form.delivery_id    : null,
    }

    const res = await window.api.uploadDocument(payload)
    if (res.success) {
      toast.success('Document uploaded and linked')
      setModal(false)
      setForm(EMPTY_FORM)
      load()
    } else {
      toast.error(res.error || 'Upload failed')
    }
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteDocument(id)
    if (res.success) { toast.success('Document deleted'); load() }
    else toast.error(res.error)
  }

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const totalSize = docs.reduce((s, d) => s + (d.file_size || 0), 0)

  // Compute link summary for each doc card
  const getLinkLabel = (d) => {
    if (d.customer_name)       return `👥 ${d.customer_name}`
    if (d.txn_ref)             return `⚖️ ${d.txn_ref}`
    if (d.account_id)          return `📒 Account #${d.account_id}`
    if (d.payment_id)          return `💳 Payment #${d.payment_id}`
    if (d.delivery_id)         return `🚚 Delivery #${d.delivery_id}`
    return null
  }

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

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const count = docs.filter(d => d.document_category === cat).length
            if (!count) return null
            return (
              <button key={cat}
                className={`btn btn-sm ${filters.category === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setF('category', filters.category === cat ? '' : cat)}>
                {catIcon[cat]} {cat} ({count})
              </button>
            )
          })}
          {filters.category && (
            <button className="btn btn-ghost btn-sm" onClick={() => setF('category', '')}>✕ Clear</button>
          )}
        </div>

        <div className="filter-row">
          <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search by name, filename…" />
        </div>

        {/* Document Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {loading && <div className="loading">Loading…</div>}
          {!loading && docs.length === 0 && (
            <div style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">
                <div className="icon">📁</div>
                <p>No documents uploaded yet</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Upload and link documents to transactions, accounts, or customers</p>
              </div>
            </div>
          )}
          {docs.map(d => {
            const linkLabel = getLinkLabel(d)
            return (
              <div key={d.id} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* File icon + name */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                    {fileIcon[d.file_type] || '📄'}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word' }}>{d.document_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{d.original_filename}</div>
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-blue">{catIcon[d.document_category]} {d.document_category}</span>
                  <span className="badge badge-gray">{d.file_type}</span>
                </div>

                {/* Link indicator */}
                {linkLabel ? (
                  <div style={{
                    padding: '5px 8px', borderRadius: 6,
                    background: 'var(--accent-muted)', border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: 11, color: 'var(--accent)', fontWeight: 500
                  }}>
                    🔗 {linkLabel}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    📌 No link — general document
                  </div>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{formatFileSize(d.file_size)}</span>
                  <span>{fmtDate(d.created_at)}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }}
                    onClick={() => window.api.openDocument(d.id).catch(() => toast.error('Could not open file'))}>
                    👁 Open
                  </button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(d.id)}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Upload Modal ──────────────────────────────────────────────────────── */}
      <Modal open={modal} onClose={() => { setModal(false); setForm(EMPTY_FORM) }}
        title="Upload & Link Document"
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setModal(false); setForm(EMPTY_FORM) }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!form.source_path}>Upload & Save</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* File picker */}
          <div className="form-group">
            <label className="form-label">Select File * (PDF, JPG, PNG, DOCX, XLSX)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" readOnly value={form.original_filename || ''} placeholder="No file selected" style={{ flex: 1 }} />
              <button className="btn btn-secondary" onClick={handleBrowse}>📂 Browse</button>
            </div>
            {/* Hidden file input for browser preview */}
            <input id="doc-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              style={{ display: 'none' }} onChange={handleFileInput} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document Name</label>
              <input className="input" value={form.document_name}
                onChange={e => set('document_name', e.target.value)}
                placeholder="Friendly name (auto-filled from filename)" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="select" value={form.document_category}
                onChange={e => set('document_category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catIcon[c]} {c}</option>)}
              </select>
            </div>
          </div>

          {/* ── Link section ───────────────────────────────────────────────── */}
          <div style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, padding: 14
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--text-primary)' }}>
              🔗 Link this document to a record
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                (it will then appear in that row's 📎 attachment panel)
              </span>
            </p>

            {/* Link type selector */}
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label">Link Type</label>
              <select className="select" value={form.link_type}
                onChange={e => set('link_type', e.target.value)}>
                {LINK_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>

            {/* Dynamic selector based on link type */}
            {form.link_type === 'customer' && (
              <div className="form-group">
                <label className="form-label">Select Customer</label>
                <select className="select" value={form.customer_id}
                  onChange={e => set('customer_id', e.target.value)}>
                  <option value="">— Select —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}{c.business_name ? ` · ${c.business_name}` : ''}</option>)}
                </select>
              </div>
            )}

            {form.link_type === 'transaction' && (
              <div className="form-group">
                <label className="form-label">Select Silver Transaction</label>
                <select className="select" value={form.transaction_id}
                  onChange={e => set('transaction_id', e.target.value)}>
                  <option value="">— Select —</option>
                  {transactions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.transaction_id} · {t.transaction_date} · {t.customer_name || t.party_name || 'Walk-in'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.link_type === 'account' && (
              <div className="form-group">
                <label className="form-label">Select Account Entry</label>
                <select className="select" value={form.account_id}
                  onChange={e => set('account_id', e.target.value)}>
                  <option value="">— Select —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.entry_date} · {a.entry_type.replace(/_/g,' ')} · {a.party_name || a.description || `#${a.id}`} · ₹{parseFloat(a.amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.link_type === 'payment' && (
              <div className="form-group">
                <label className="form-label">Select Payment</label>
                <select className="select" value={form.payment_id}
                  onChange={e => set('payment_id', e.target.value)}>
                  <option value="">— Select —</option>
                  {payments.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.payment_date} · {p.customer_name || 'Walk-in'} · ₹{parseFloat(p.payment_amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.link_type === 'delivery' && (
              <div className="form-group">
                <label className="form-label">Select Delivery</label>
                <select className="select" value={form.delivery_id}
                  onChange={e => set('delivery_id', e.target.value)}>
                  <option value="">— Select —</option>
                  {deliveries.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.delivery_date} · {d.destination_city || '—'} · {d.customer_name || 'No customer'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!form.link_type && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                The document will be saved without any link. You can still find it here on the Documents page.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" rows={2} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes about this document" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Document"
        message="This will permanently delete the file. This cannot be undone."
        danger />
    </div>
  )
}
