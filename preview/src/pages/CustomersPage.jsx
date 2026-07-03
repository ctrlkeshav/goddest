import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtWeight } from '../utils/format'

const EMPTY = {
  customer_name: '', business_name: '', mobile: '', address: '',
  gst_number: '', city: '', state: '', notes: ''
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [viewCustomer, setViewCustomer] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getCustomers({ search })
    if (res.success) setCustomers(res.data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (c) => {
    setForm({ ...c })
    setEditing(c)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.customer_name.trim()) return toast.error('Customer name is required')
    const res = editing
      ? await window.api.updateCustomer({ ...form, id: editing.id })
      : await window.api.createCustomer(form)
    if (res.success) {
      toast.success(editing ? 'Customer updated' : 'Customer created')
      setModal(false)
      load()
    } else toast.error(res.error || 'Failed to save')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteCustomer(id)
    if (res.success) { toast.success('Customer removed'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👥 Customers</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{customers.length} accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Customer</button>
      </div>

      <div className="page-content">
        <div className="filter-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, mobile, city…" />
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Customer</th><th>Business</th><th>Mobile</th>
                <th>City / State</th><th>GST No.</th><th>Silver Issued</th>
                <th>Fine Received</th><th>Pending Balance</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10}><div className="loading">Loading…</div></td></tr>}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={10}>
                  <div className="empty-state"><div className="icon">👥</div>No customers found</div>
                </td></tr>
              )}
              {customers.map((c, i) => {
                const pending = (c.total_silver_issued || 0) * 0 + (parseFloat(c.balance_fine || 0))
                const pendingFine = (parseFloat(c.total_silver_issued || 0)) - (parseFloat(c.total_fine_received || 0))
                return (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                      {c.notes && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.notes.slice(0, 40)}</div>}
                    </td>
                    <td>{c.business_name || '—'}</td>
                    <td>{c.mobile || '—'}</td>
                    <td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                    <td><span className="font-mono text-sm">{c.gst_number || '—'}</span></td>
                    <td style={{ color: 'var(--accent)' }}>{fmtWeight(c.total_silver_issued)}</td>
                    <td style={{ color: 'var(--success)' }}>{fmtWeight(c.total_fine_received)}</td>
                    <td>
                      <span style={{ color: pendingFine > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        {fmtWeight(pendingFine)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={() => setViewCustomer(c)}>👁</button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => setDelConfirm(c.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Customer' : 'Add New Customer'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              {editing ? 'Update Customer' : 'Create Customer'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input className="input" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Business Name</label>
              <input className="input" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Company / Firm name" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input className="input" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="input" value={form.gst_number} onChange={e => set('gst_number', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="input" value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input className="input" value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="textarea" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Remarks</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any remarks about this customer" rows={2} />
          </div>
        </div>
      </Modal>

      {/* View Customer Modal */}
      {viewCustomer && (
        <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Customer Details">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoRow label="Customer Name" value={viewCustomer.customer_name} />
            <InfoRow label="Business Name" value={viewCustomer.business_name} />
            <InfoRow label="Mobile" value={viewCustomer.mobile} />
            <InfoRow label="GST Number" value={viewCustomer.gst_number} />
            <InfoRow label="City" value={viewCustomer.city} />
            <InfoRow label="State" value={viewCustomer.state} />
            <InfoRow label="Address" value={viewCustomer.address} />
            <div className="sep" />
            <InfoRow label="Total Silver Issued" value={fmtWeight(viewCustomer.total_silver_issued)} highlight="accent" />
            <InfoRow label="Total Fine Received" value={fmtWeight(viewCustomer.total_fine_received)} highlight="success" />
            <InfoRow label="Pending Fine Balance" value={fmtWeight((viewCustomer.total_silver_issued || 0) - (viewCustomer.total_fine_received || 0))} highlight="danger" />
            <div className="sep" />
            <InfoRow label="Notes" value={viewCustomer.notes} />
            <InfoRow label="Created On" value={fmtDate(viewCustomer.created_at)} />
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!delConfirm}
        onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Customer"
        message="This will deactivate the customer. All associated data will be preserved. Continue?"
        danger
      />
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  const colors = { accent: 'var(--accent)', success: 'var(--success)', danger: 'var(--danger)' }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: highlight ? 600 : 400, color: highlight ? colors[highlight] : 'var(--text-primary)', textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  )
}
