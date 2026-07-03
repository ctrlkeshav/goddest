import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, paymentMethodLabel, today } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  payment_date: today(), customer_id: '', payment_amount: '',
  payment_method: 'cash', reference_number: '', notes: ''
}

const METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
  { value: 'cheque', label: '📝 Cheque' },
  { value: 'upi', label: '📱 UPI' },
]

const methodBadge = { cash: 'badge-green', bank_transfer: 'badge-blue', cheque: 'badge-amber', upi: 'badge-silver' }

export default function PaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', method: '', from: '', to: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getPayments(filters)
    if (res.success) setPayments(res.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { window.api.getCustomers({}).then(r => r.success && setCustomers(r.data)) }, [])

  const openNew = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (p) => {
    setForm({
      payment_date: p.payment_date, customer_id: p.customer_id,
      payment_amount: p.payment_amount, payment_method: p.payment_method,
      reference_number: p.reference_number || '', notes: p.notes || ''
    })
    setEditing(p); setModal(true)
  }

  const handleSave = async () => {
    if (!form.customer_id) return toast.error('Select a customer')
    if (!form.payment_amount || parseFloat(form.payment_amount) <= 0) return toast.error('Enter valid amount')
    const payload = { ...form, created_by: user?.id }
    const res = editing
      ? await window.api.updatePayment({ ...payload, id: editing.id })
      : await window.api.createPayment(payload)
    if (res.success) { toast.success(editing ? 'Payment updated' : 'Payment recorded'); setModal(false); load() }
    else toast.error(res.error || 'Failed')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deletePayment(id)
    if (res.success) { toast.success('Payment deleted'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.payment_amount) || 0), 0)
  const byCash = payments.filter(p => p.payment_method === 'cash').reduce((s, p) => s + parseFloat(p.payment_amount || 0), 0)
  const byBank = payments.filter(p => p.payment_method === 'bank_transfer').reduce((s, p) => s + parseFloat(p.payment_amount || 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💳 Payments & Settlements</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{payments.length} records</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Record Payment</button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="stats-grid">
          <div className="stat-card stat-green"><span className="label">Total Received</span><span className="value" style={{ color: 'var(--success)' }}>₹{totalPaid.toLocaleString('en-IN')}</span></div>
          <div className="stat-card"><span className="label">By Cash</span><span className="value text-accent">₹{byCash.toLocaleString('en-IN')}</span></div>
          <div className="stat-card stat-blue"><span className="label">By Bank Transfer</span><span className="value" style={{ color: 'var(--accent-2)' }}>₹{byBank.toLocaleString('en-IN')}</span></div>
          <div className="stat-card"><span className="label">No. of Transactions</span><span className="value" style={{ color: 'var(--info)' }}>{payments.length}</span></div>
        </div>

        <div className="filter-row">
          <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search by customer, reference…" />
          <select className="select" style={{ width: 160 }} value={filters.method} onChange={e => setF('method', e.target.value)}>
            <option value="">All Methods</option>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <input className="input" type="date" style={{ width: 140 }} value={filters.from} onChange={e => setF('from', e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <input className="input" type="date" style={{ width: 140 }} value={filters.to} onChange={e => setF('to', e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', method: '', from: '', to: '' })}>Clear</button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Date</th><th>Customer</th><th>Amount</th>
                <th>Method</th><th>Reference No.</th><th>Notes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8}><div className="loading">Loading…</div></td></tr>}
              {!loading && payments.length === 0 && (
                <tr><td colSpan={8}><div className="empty-state"><div className="icon">💳</div>No payments recorded</div></td></tr>
              )}
              {payments.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                  <td>{fmtDate(p.payment_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.customer_name}</div>
                    {p.business_name && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.business_name}</div>}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: 14 }}>
                      ₹{parseFloat(p.payment_amount).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td><span className={`badge ${methodBadge[p.payment_method] || 'badge-gray'}`}>{paymentMethodLabel(p.payment_method)}</span></td>
                  <td><span className="font-mono text-sm">{p.reference_number || '—'}</span></td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{p.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(p.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Payment' : 'Record Payment'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Record Payment'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Payment Date *</label>
              <input className="input" type="date" value={form.payment_date} onChange={e => set('payment_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <select className="select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input className="input" type="number" step="0.01" value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method *</label>
              <select className="select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Transaction Reference Number</label>
            <input className="input" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Cheque no., UTR, UPI ref…" />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" rows={2} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Payment" message="Permanently delete this payment record?" danger />
    </div>
  )
}
