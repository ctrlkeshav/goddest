import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js'
import RowDocuments from '../components/UI/RowDocuments'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, today } from '../utils/format'
import { useAuth } from '../context/AuthContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

const ENTRY_TYPES = [
  { value: 'income',           label: '💰 Income',           color: 'var(--success)' },
  { value: 'expense',          label: '💸 Expense',          color: 'var(--danger)' },
  { value: 'silver_purchase',  label: '🥈 Silver Purchase',  color: 'var(--accent)' },
  { value: 'silver_sale',      label: '🥇 Silver Sale',      color: 'var(--warning)' },
  { value: 'bank_deposit',     label: '🏦 Bank Deposit',     color: 'var(--accent-2)' },
  { value: 'bank_withdrawal',  label: '🏧 Bank Withdrawal',  color: '#a78bfa' },
  { value: 'loan_given',       label: '📤 Loan Given',       color: '#f472b6' },
  { value: 'loan_received',    label: '📥 Loan Received',    color: '#34d399' },
  { value: 'other',            label: '📌 Other',            color: 'var(--text-muted)' },
]

const METHODS = ['cash','bank_transfer','cheque','upi','other']
const methodLabel = { cash:'Cash', bank_transfer:'Bank Transfer', cheque:'Cheque', upi:'UPI', other:'Other' }
const typeLabel = Object.fromEntries(ENTRY_TYPES.map(t => [t.value, t.label]))
const typeColor = Object.fromEntries(ENTRY_TYPES.map(t => [t.value, t.color]))

const EMPTY = {
  entry_date: today(), entry_type: 'income', category: '', party_name: '',
  amount: '', silver_weight: '', silver_rate: '',
  payment_method: 'cash', reference_number: '', description: ''
}

const chartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
  }
}

export default function AccountsPage() {
  const { user } = useAuth()
  const [entries, setEntries]   = useState([])
  const [summary, setSummary]   = useState(null)
  const [monthly, setMonthly]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal,   setModal]     = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form,    setForm]      = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', type: '', from: '', to: '' })
  const [view, setView] = useState('list') // 'list' | 'summary'

  const load = useCallback(async () => {
    setLoading(true)
    const [entriesRes, sumRes, monthRes] = await Promise.all([
      window.api.getAccounts(filters),
      window.api.getAccountSummary({ from: filters.from, to: filters.to }),
      window.api.getAccountMonthly({})
    ])
    if (entriesRes.success) setEntries(entriesRes.data)
    if (sumRes.success)     setSummary(sumRes.data)
    if (monthRes.success)   setMonthly(monthRes.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (e) => {
    setForm({
      entry_date: e.entry_date, entry_type: e.entry_type, category: e.category || '',
      party_name: e.party_name || '', amount: e.amount || '', silver_weight: e.silver_weight || '',
      silver_rate: e.silver_rate || '', payment_method: e.payment_method || 'cash',
      reference_number: e.reference_number || '', description: e.description || ''
    })
    setEditing(e); setModal(true)
  }

  const handleSave = async () => {
    if (!form.entry_date) return toast.error('Date is required')
    if (!form.amount || parseFloat(form.amount) <= 0) return toast.error('Enter a valid amount')
    const payload = { ...form, created_by: user?.id }
    const res = editing
      ? await window.api.updateAccount({ ...payload, id: editing.id })
      : await window.api.createAccount(payload)
    if (res.success) { toast.success(editing ? 'Entry updated' : 'Entry added'); setModal(false); load() }
    else toast.error(res.error || 'Failed')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteAccount(id)
    if (res.success) { toast.success('Entry deleted'); load() }
    else toast.error(res.error)
  }

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const showSilver = form.entry_type === 'silver_purchase' || form.entry_type === 'silver_sale'

  // Auto-calc amount from weight × rate
  useEffect(() => {
    if (showSilver && form.silver_weight && form.silver_rate) {
      const computed = (parseFloat(form.silver_weight) * parseFloat(form.silver_rate)).toFixed(2)
      setForm(p => ({ ...p, amount: computed }))
    }
  }, [form.silver_weight, form.silver_rate, form.entry_type])

  const monthlyChartData = {
    labels: monthly.map(m => m.month),
    datasets: [
      { label: 'Income (₹)',          data: monthly.map(m => m.income),          backgroundColor: 'rgba(16,185,129,0.6)', borderRadius: 3 },
      { label: 'Expense (₹)',         data: monthly.map(m => m.expense),         backgroundColor: 'rgba(239,68,68,0.6)',  borderRadius: 3 },
      { label: 'Silver Purchase (₹)', data: monthly.map(m => m.silver_purchase), backgroundColor: 'rgba(245,158,11,0.6)', borderRadius: 3 },
      { label: 'Silver Sale (₹)',     data: monthly.map(m => m.silver_sale),     backgroundColor: 'rgba(59,130,246,0.6)', borderRadius: 3 },
    ]
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📒 General Accounts</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{entries.length} entries</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}>📋 Ledger</button>
          <button className={`btn btn-sm ${view === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('summary')}>📊 Summary</button>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Entry</button>
        </div>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary Cards — always visible */}
        {summary && (
          <div className="stats-grid">
            <div className="stat-card stat-green">
              <span className="label">Total Income</span>
              <span className="value" style={{ color: 'var(--success)' }}>₹{parseFloat(summary.total_income).toLocaleString('en-IN')}</span>
            </div>
            <div className="stat-card stat-red">
              <span className="label">Total Expense</span>
              <span className="value" style={{ color: 'var(--danger)' }}>₹{parseFloat(summary.total_expense).toLocaleString('en-IN')}</span>
            </div>
            <div className="stat-card stat-accent">
              <span className="label">Silver Purchased</span>
              <span className="value" style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>
                ₹{parseFloat(summary.total_silver_purchase).toLocaleString('en-IN')}
              </span>
              <span className="sub">{parseFloat(summary.total_silver_bought_g || 0).toFixed(3)} g</span>
            </div>
            <div className="stat-card stat-blue">
              <span className="label">Silver Sold</span>
              <span className="value" style={{ color: 'var(--accent-2)', fontSize: '1.1rem' }}>
                ₹{parseFloat(summary.total_silver_sale).toLocaleString('en-IN')}
              </span>
              <span className="sub">{parseFloat(summary.total_silver_sold_g || 0).toFixed(3)} g</span>
            </div>
            <div className="stat-card" style={{ borderColor: summary.net_cashflow >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
              <span className="label">Net Cash Flow</span>
              <span className="value" style={{ color: summary.net_cashflow >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.1rem' }}>
                {summary.net_cashflow >= 0 ? '+' : ''}₹{parseFloat(summary.net_cashflow).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="stat-card">
              <span className="label">Bank Deposits</span>
              <span className="value" style={{ color: 'var(--info)', fontSize: '1.1rem' }}>₹{parseFloat(summary.total_bank_deposit).toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Summary View — chart */}
        {view === 'summary' && (
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem' }}>📈 Monthly Breakdown</h3>
            <div style={{ height: 280 }}>
              {monthly.length > 0
                ? <Bar data={monthlyChartData} options={chartOpts} />
                : <div className="empty-state"><div className="icon">📊</div>No data yet</div>
              }
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <>
            {/* Type filter chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${!filters.type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setF('type', '')}>All</button>
              {ENTRY_TYPES.map(t => (
                <button key={t.value}
                  className={`btn btn-sm ${filters.type === t.value ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setF('type', filters.type === t.value ? '' : t.value)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="filter-row">
              <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search by party, description, reference…" />
              <input className="input" type="date" style={{ width: 140 }} value={filters.from} onChange={e => setF('from', e.target.value)} />
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
              <input className="input" type="date" style={{ width: 140 }} value={filters.to} onChange={e => setF('to', e.target.value)} />
              <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', type: '', from: '', to: '' })}>Clear</button>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Type</th><th>Category</th><th>Party</th>
                    <th>Amount</th><th>Silver</th><th>Method</th><th>Reference</th>
                    <th>Description</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={10}><div className="loading">Loading…</div></td></tr>}
                  {!loading && entries.length === 0 && (
                    <tr><td colSpan={10}><div className="empty-state"><div className="icon">📒</div>No entries found</div></td></tr>
                  )}
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.entry_date)}</td>
                      <td>
                        <span className="badge" style={{ background: `${typeColor[e.entry_type]}22`, color: typeColor[e.entry_type] }}>
                          {typeLabel[e.entry_type] || e.entry_type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{e.category || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{e.party_name || '—'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: 14,
                          color: ['income','silver_sale','bank_withdrawal','loan_received'].includes(e.entry_type) ? 'var(--success)' : 'var(--danger)'
                        }}>
                          ₹{parseFloat(e.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent)', fontSize: 12 }}>
                        {e.silver_weight > 0 ? `${parseFloat(e.silver_weight).toFixed(3)} g` : '—'}
                        {e.silver_rate > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>@₹{e.silver_rate}/g</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{e.payment_method ? methodLabel[e.payment_method] : '—'}</td>
                      <td><span className="font-mono text-sm">{e.reference_number || '—'}</span></td>
                      <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {e.description || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <RowDocuments
                            linkKey="account_id"
                            linkId={e.id}
                            userId={user?.id}
                            label={`${e.entry_type.replace('_',' ').toUpperCase()} · ${e.entry_date}`}
                          />
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(e)}>✏️</button>
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(e.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Account Entry' : 'Add Account Entry'}
        size="modal-lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Entry'}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="input" type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Type *</label>
              <select className="select" value={form.entry_type} onChange={e => set('entry_type', e.target.value)}>
                {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Party / Person Name</label>
              <input className="input" value={form.party_name} onChange={e => set('party_name', e.target.value)} placeholder="Vendor, supplier, customer…" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="input" value={form.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Rent, Salary, Transport…" />
            </div>
          </div>

          {/* Silver fields — only for silver purchase/sale */}
          {showSilver && (
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Silver Weight (g)</label>
                <input className="input" type="number" step="0.001" value={form.silver_weight}
                  onChange={e => set('silver_weight', e.target.value)} placeholder="0.000" />
              </div>
              <div className="form-group">
                <label className="form-label">Rate per Gram (₹/g)</label>
                <input className="input" type="number" step="0.01" value={form.silver_rate}
                  onChange={e => set('silver_rate', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Total Amount (₹) *</label>
                <input className="input" type="number" step="0.01" value={form.amount}
                  onChange={e => set('amount', e.target.value)} placeholder="auto-calculated" />
              </div>
            </div>
          )}

          {!showSilver && (
            <div className="form-group">
              <label className="form-label">Amount (₹) *</label>
              <input className="input" type="number" step="0.01" value={form.amount}
                onChange={e => set('amount', e.target.value)} placeholder="0.00" />
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="select" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {METHODS.map(m => <option key={m} value={m}>{methodLabel[m]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input className="input" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="Cheque no., UTR, bill no…" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Notes</label>
            <textarea className="textarea" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this entry for?" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Entry" message="Permanently delete this account entry?" danger />
    </div>
  )
}
