import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtWeight, txnTypeLabel, txnTypeBadge, today } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  transaction_date: today(), customer_id: '', transaction_type: 'silver_issued',
  gross_silver_given: '', fine_silver_received: '', purity_percentage: '',
  wastage_percentage: '', balance_fine_silver: '', payment_amount: '', remarks: ''
}

const TYPES = [
  { value: 'silver_issued', label: 'Silver Issued to Customer' },
  { value: 'fine_received', label: 'Fine Silver Received' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'adjustment', label: 'Adjustment Entry' }
]

export default function TransactionsPage() {
  const { user } = useAuth()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', type: '', from: '', to: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [txRes, sumRes] = await Promise.all([
      window.api.getTransactions(filters),
      window.api.getTransactionSummary()
    ])
    if (txRes.success) setTxns(txRes.data)
    if (sumRes.success) setSummary(sumRes.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    window.api.getCustomers({}).then(r => r.success && setCustomers(r.data))
  }, [])

  // Auto-calculate recoverable fine silver
  useEffect(() => {
    if (form.transaction_type === 'silver_issued') {
      const gross = parseFloat(form.gross_silver_given) || 0
      const purity = parseFloat(form.purity_percentage) || 0
      const wastage = parseFloat(form.wastage_percentage) || 0
      const recoverable = gross * purity / 100
      const balance = recoverable * (1 - wastage / 100)
      setForm(p => ({ ...p, balance_fine_silver: balance.toFixed(3) }))
    }
  }, [form.gross_silver_given, form.purity_percentage, form.wastage_percentage, form.transaction_type])

  const openNew = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (t) => {
    setForm({
      transaction_date: t.transaction_date, customer_id: t.customer_id,
      transaction_type: t.transaction_type, gross_silver_given: t.gross_silver_given || '',
      fine_silver_received: t.fine_silver_received || '', purity_percentage: t.purity_percentage || '',
      wastage_percentage: t.wastage_percentage || '', balance_fine_silver: t.balance_fine_silver || '',
      payment_amount: t.payment_amount || '', remarks: t.remarks || ''
    })
    setEditing(t)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.customer_id) return toast.error('Select a customer')
    if (!form.transaction_date) return toast.error('Date is required')
    const payload = { ...form, created_by: user?.id }
    const res = editing
      ? await window.api.updateTransaction({ ...payload, id: editing.id })
      : await window.api.createTransaction(payload)
    if (res.success) {
      toast.success(editing ? 'Transaction updated' : `Transaction created: ${res.transaction_id || ''}`)
      setModal(false)
      load()
    } else toast.error(res.error || 'Failed to save')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteTransaction(id)
    if (res.success) { toast.success('Transaction deleted'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const showGross = form.transaction_type === 'silver_issued'
  const showFine = form.transaction_type === 'fine_received'
  const showPayment = form.transaction_type === 'payment_received'

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>⚖️ Silver Transactions</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{txns.length} records</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Transaction</button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Summary Bar */}
        {summary && (
          <div className="stats-grid">
            <SumCard label="Total Gross Issued" value={fmtWeight(summary.total_issued)} color="var(--accent)" />
            <SumCard label="Total Fine Received" value={fmtWeight(summary.total_received)} color="var(--success)" />
            <SumCard label="Total Recoverable" value={fmtWeight(summary.total_recoverable)} color="var(--info)" />
            <SumCard label="Outstanding Pending" value={fmtWeight(summary.total_pending)} color="var(--danger)" />
          </div>
        )}

        {/* Filters */}
        <div className="filter-row">
          <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search by customer, TXN ID…" />
          <select className="select" style={{ width: 180 }} value={filters.type} onChange={e => setF('type', e.target.value)}>
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="input" type="date" style={{ width: 140 }} value={filters.from} onChange={e => setF('from', e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <input className="input" type="date" style={{ width: 140 }} value={filters.to} onChange={e => setF('to', e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', type: '', from: '', to: '' })}>Clear</button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>TXN ID</th><th>Date</th><th>Customer</th><th>Type</th>
                <th>Gross Silver</th><th>Fine Received</th><th>Purity %</th>
                <th>Wastage %</th><th>Balance Fine</th><th>Remarks</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11}><div className="loading">Loading…</div></td></tr>}
              {!loading && txns.length === 0 && (
                <tr><td colSpan={11}><div className="empty-state"><div className="icon">⚖️</div>No transactions found</div></td></tr>
              )}
              {txns.map(t => (
                <tr key={t.id}>
                  <td><span className="font-mono text-sm text-accent">{t.transaction_id}</span></td>
                  <td>{fmtDate(t.transaction_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.customer_name}</div>
                    {t.business_name && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.business_name}</div>}
                  </td>
                  <td><span className={`badge ${txnTypeBadge(t.transaction_type)}`}>{txnTypeLabel(t.transaction_type)}</span></td>
                  <td>{t.gross_silver_given ? fmtWeight(t.gross_silver_given) : '—'}</td>
                  <td>{t.fine_silver_received ? fmtWeight(t.fine_silver_received) : '—'}</td>
                  <td>{t.purity_percentage ? `${t.purity_percentage}%` : '—'}</td>
                  <td>{t.wastage_percentage ? `${t.wastage_percentage}%` : '—'}</td>
                  <td>
                    {t.balance_fine_silver !== 0 ? (
                      <span style={{ color: t.balance_fine_silver > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        {fmtWeight(t.balance_fine_silver)}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {t.remarks || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(t)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(t.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      <Modal
        open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Transaction' : 'New Transaction'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Create Transaction'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Transaction Date *</label>
              <input className="input" type="date" value={form.transaction_date} onChange={e => set('transaction_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Transaction Type *</label>
              <select className="select" value={form.transaction_type} onChange={e => set('transaction_type', e.target.value)}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select className="select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
              <option value="">— Select Customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}{c.business_name ? ` (${c.business_name})` : ''}</option>)}
            </select>
          </div>

          {showGross && (
            <>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Gross Silver Given (g) *</label>
                  <input className="input" type="number" step="0.001" value={form.gross_silver_given} onChange={e => set('gross_silver_given', e.target.value)} placeholder="0.000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Purity Percentage (%)</label>
                  <input className="input" type="number" step="0.01" max="100" value={form.purity_percentage} onChange={e => set('purity_percentage', e.target.value)} placeholder="95.50" />
                </div>
                <div className="form-group">
                  <label className="form-label">Wastage Percentage (%)</label>
                  <input className="input" type="number" step="0.01" max="100" value={form.wastage_percentage} onChange={e => set('wastage_percentage', e.target.value)} placeholder="2.00" />
                </div>
              </div>
              <div className="card" style={{ background: 'var(--accent-muted)', borderColor: 'rgba(245,158,11,0.3)', padding: 14 }}>
                <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Recoverable Fine Silver</span>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>
                      {(((parseFloat(form.gross_silver_given) || 0) * (parseFloat(form.purity_percentage) || 0)) / 100).toFixed(3)} g
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Balance After Wastage</span>
                    <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>
                      {form.balance_fine_silver || '0.000'} g
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {showFine && (
            <div className="form-group">
              <label className="form-label">Fine Silver Received (g) *</label>
              <input className="input" type="number" step="0.001" value={form.fine_silver_received} onChange={e => set('fine_silver_received', e.target.value)} placeholder="0.000" />
            </div>
          )}

          {showPayment && (
            <div className="form-group">
              <label className="form-label">Payment Amount (₹) *</label>
              <input className="input" type="number" step="0.01" value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)} placeholder="0.00" />
            </div>
          )}

          {form.transaction_type === 'adjustment' && (
            <div className="form-group">
              <label className="form-label">Adjustment Amount (g) — positive adds, negative deducts</label>
              <input className="input" type="number" step="0.001" value={form.balance_fine_silver} onChange={e => set('balance_fine_silver', e.target.value)} placeholder="0.000" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="textarea" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any notes about this transaction" rows={2} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Transaction"
        message="This will permanently delete the transaction record. This cannot be undone."
        danger
      />
    </div>
  )
}

function SumCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <span className="label">{label}</span>
      <span className="value" style={{ color, fontSize: '1.2rem' }}>{value}</span>
    </div>
  )
}
