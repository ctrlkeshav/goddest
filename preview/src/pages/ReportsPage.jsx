import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { fmtDate, fmtWeight, txnTypeLabel, txnTypeBadge, paymentMethodLabel, today } from '../utils/format'

const REPORTS = [
  { id: 'pending_balance', label: '⏳ Pending Balance Report', desc: 'All customers with outstanding fine silver' },
  { id: 'customer_ledger', label: '📒 Customer Ledger', desc: 'Full transaction history for a single customer' },
  { id: 'silver_statement', label: '⚖️ Silver Account Statement', desc: 'All silver transactions in a date range' },
  { id: 'delivery_report', label: '🚚 Delivery Report', desc: 'All deliveries with employee and customer details' },
  { id: 'payment_history', label: '💳 Payment History', desc: 'All payments in a date range' },
]

export default function ReportsPage() {
  const [selected, setSelected] = useState('pending_balance')
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [filters, setFilters] = useState({ customerId: '', from: '', to: '', employeeId: '', method: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.getCustomers({}).then(r => r.success && setCustomers(r.data))
    window.api.getEmployees({}).then(r => r.success && setEmployees(r.data))
  }, [])

  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const runReport = async () => {
    setLoading(true)
    setData(null)
    try {
      let res
      if (selected === 'pending_balance') res = await window.api.generatePendingBalance()
      else if (selected === 'customer_ledger') res = await window.api.generateCustomerLedger({ customerId: filters.customerId, from: filters.from, to: filters.to })
      else if (selected === 'silver_statement') res = await window.api.generateSilverStatement({ from: filters.from, to: filters.to })
      else if (selected === 'delivery_report') res = await window.api.generateDeliveryReport({ from: filters.from, to: filters.to, customerId: filters.customerId, employeeId: filters.employeeId })
      else if (selected === 'payment_history') res = await window.api.generatePaymentHistory({ from: filters.from, to: filters.to, customerId: filters.customerId, method: filters.method })

      if (res?.success) setData(res.data)
      else toast.error(res?.error || 'Failed to generate report')
    } catch (e) { toast.error(e.message) }
    setLoading(false)
  }

  const exportExcel = async () => {
    if (!data) return
    let rows = []
    if (selected === 'pending_balance') rows = Array.isArray(data) ? data.map(r => ({ Customer: r.customer_name, Business: r.business_name, Mobile: r.mobile, City: r.city, 'Total Recoverable (g)': r.total_recoverable, 'Fine Received (g)': r.total_fine_received, 'Pending Fine (g)': r.pending_fine })) : []
    else if (selected === 'silver_statement') rows = Array.isArray(data) ? data.map(r => ({ 'TXN ID': r.transaction_id, Date: r.transaction_date, Customer: r.customer_name, Type: txnTypeLabel(r.transaction_type), 'Gross Silver (g)': r.gross_silver_given, 'Fine Received (g)': r.fine_silver_received, 'Purity %': r.purity_percentage, 'Balance Fine (g)': r.balance_fine_silver, 'Making Charges (₹)': r.making_charges || 0, 'Charge Type': r.making_charges_type || 'fixed', Remarks: r.remarks })) : []
    else if (selected === 'payment_history') rows = Array.isArray(data) ? data.map(r => ({ Date: r.payment_date, Customer: r.customer_name, 'Amount (₹)': r.payment_amount, Method: paymentMethodLabel(r.payment_method), Reference: r.reference_number, Notes: r.notes })) : []
    else if (selected === 'delivery_report') rows = Array.isArray(data) ? data.map(r => ({ Date: r.delivery_date, City: r.destination_city, State: r.destination_state, Customer: r.customer_name, Employee: r.employee_name, Vehicle: r.vehicle_details, Purpose: r.purpose, 'Silver Delivered (g)': r.silver_weight_delivered, 'Fine Collected (g)': r.fine_silver_collected, 'Expenses (₹)': r.travel_expenses })) : []
    else if (selected === 'customer_ledger' && data?.ledger) rows = data.ledger.map(r => ({ 'TXN ID': r.transaction_id, Date: r.transaction_date, Type: txnTypeLabel(r.transaction_type), 'Gross Silver (g)': r.gross_silver_given, 'Fine Received (g)': r.fine_silver_received, 'Balance Fine (g)': r.balance_fine_silver, 'Running Balance (g)': r.running_balance, 'Making Charges (₹)': r.making_charges || 0, Remarks: r.remarks }))

    if (!rows.length) return toast.error('No data to export')
    const res = await window.api.exportToExcel({ type: selected, data: rows, filename: `${selected}_${Date.now()}.xlsx` })
    if (res.success) toast.success(`Exported to: ${res.path}`)
    else toast.error(res.error)
  }

  const exportCSV = async () => {
    if (!data) return
    const rows = flattenData()
    if (!rows.length) return toast.error('No data to export')
    const res = await window.api.exportToCSV({ data: rows, filename: `${selected}_${Date.now()}.csv` })
    if (res.success) toast.success(`CSV saved: ${res.path}`)
    else toast.error(res.error)
  }

  const flattenData = () => {
    if (!data) return []
    if (Array.isArray(data)) return data
    if (data.ledger) return data.ledger
    return []
  }

  const renderResults = () => {
    if (loading) return <div className="loading">Generating report…</div>
    if (!data) return <div className="empty-state"><div className="icon">📊</div>Configure filters and click Generate Report</div>

    if (selected === 'pending_balance' && Array.isArray(data)) return (
      <table className="data-table">
        <thead><tr><th>#</th><th>Customer</th><th>Mobile</th><th>City</th><th>Total Recoverable</th><th>Fine Received</th><th>Pending Fine</th></tr></thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td><div style={{ fontWeight: 500 }}>{r.customer_name}</div>{r.business_name && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.business_name}</div>}</td>
              <td>{r.mobile || '—'}</td>
              <td>{r.city || '—'}</td>
              <td style={{ color: 'var(--accent)' }}>{fmtWeight(r.total_recoverable)}</td>
              <td style={{ color: 'var(--success)' }}>{fmtWeight(r.total_fine_received)}</td>
              <td><span style={{ color: r.pending_fine > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{fmtWeight(r.pending_fine)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (selected === 'customer_ledger' && data.ledger) {
      const c = data.customer
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {c && <div className="card" style={{ padding: 14, borderColor: 'rgba(245,158,11,0.3)' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Info label="Customer" value={c.customer_name} /><Info label="Business" value={c.business_name} />
              <Info label="Mobile" value={c.mobile} /><Info label="GST" value={c.gst_number} /><Info label="City" value={c.city} />
            </div>
          </div>}
          <table className="data-table">
            <thead><tr><th>TXN ID</th><th>Date</th><th>Type</th><th>Gross Silver</th><th>Fine Received</th><th>Balance Fine</th><th>Running Balance</th><th>Remarks</th></tr></thead>
            <tbody>
              {data.ledger.map(t => (
                <tr key={t.id}>
                  <td><span className="font-mono text-sm text-accent">{t.transaction_id}</span></td>
                  <td>{fmtDate(t.transaction_date)}</td>
                  <td><span className={`badge ${txnTypeBadge(t.transaction_type)}`}>{txnTypeLabel(t.transaction_type)}</span></td>
                  <td>{t.gross_silver_given ? fmtWeight(t.gross_silver_given) : '—'}</td>
                  <td>{t.fine_silver_received ? fmtWeight(t.fine_silver_received) : '—'}</td>
                  <td>{t.balance_fine_silver ? fmtWeight(t.balance_fine_silver) : '—'}</td>
                  <td><span style={{ fontWeight: 700, color: t.running_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtWeight(t.running_balance)}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if ((selected === 'silver_statement') && Array.isArray(data)) return (
      <table className="data-table">
        <thead><tr><th>TXN ID</th><th>Date</th><th>Customer</th><th>Type</th><th>Gross Silver</th><th>Fine Received</th><th>Purity</th><th>Balance Fine</th><th>Making Charges</th></tr></thead>
        <tbody>
          {data.map(t => (
            <tr key={t.id}>
              <td><span className="font-mono text-sm text-accent">{t.transaction_id}</span></td>
              <td>{fmtDate(t.transaction_date)}</td>
              <td>{t.customer_name}</td>
              <td><span className={`badge ${txnTypeBadge(t.transaction_type)}`}>{txnTypeLabel(t.transaction_type)}</span></td>
              <td>{t.gross_silver_given ? fmtWeight(t.gross_silver_given) : '—'}</td>
              <td>{t.fine_silver_received ? fmtWeight(t.fine_silver_received) : '—'}</td>
              <td>{t.purity_percentage ? `${t.purity_percentage}%` : '—'}</td>
              <td style={{ fontWeight: 600, color: t.balance_fine_silver > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmtWeight(t.balance_fine_silver)}</td>
              <td>
                {t.making_charges > 0
                  ? <span style={{ color: 'var(--warning)', fontWeight: 600 }}>₹{parseFloat(t.making_charges).toLocaleString('en-IN')}</span>
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (selected === 'delivery_report' && Array.isArray(data)) return (
      <table className="data-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Employee</th><th>City</th><th>Silver Delivered</th><th>Fine Collected</th><th>Expenses</th><th>Purpose</th></tr></thead>
        <tbody>
          {data.map(d => (
            <tr key={d.id}>
              <td>{fmtDate(d.delivery_date)}</td><td>{d.customer_name || '—'}</td><td>{d.employee_name || '—'}</td>
              <td>{d.destination_city || '—'}</td>
              <td style={{ color: 'var(--accent)' }}>{d.silver_weight_delivered ? fmtWeight(d.silver_weight_delivered) : '—'}</td>
              <td style={{ color: 'var(--success)' }}>{d.fine_silver_collected ? fmtWeight(d.fine_silver_collected) : '—'}</td>
              <td>{d.travel_expenses ? `₹${parseFloat(d.travel_expenses).toLocaleString('en-IN')}` : '—'}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{d.purpose || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )

    if (selected === 'payment_history' && Array.isArray(data)) return (
      <table className="data-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th></tr></thead>
        <tbody>
          {data.map(p => (
            <tr key={p.id}>
              <td>{fmtDate(p.payment_date)}</td><td>{p.customer_name}</td>
              <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>₹{parseFloat(p.payment_amount).toLocaleString('en-IN')}</span></td>
              <td>{paymentMethodLabel(p.payment_method)}</td>
              <td><span className="font-mono text-sm">{p.reference_number || '—'}</span></td>
              <td style={{ color: 'var(--text-secondary)' }}>{p.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
    return <div className="empty-state">No data</div>
  }

  const rowCount = Array.isArray(data) ? data.length : data?.ledger?.length || 0

  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 Reports</h1>
        {data && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>⬇ CSV</button>
            <button className="btn btn-success btn-sm" onClick={exportExcel}>📊 Excel</button>
          </div>
        )}
      </div>

      <div className="page-content" style={{ display: 'flex', gap: 20, height: '100%' }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Report Type</p>
          {REPORTS.map(r => (
            <button key={r.id}
              onClick={() => { setSelected(r.id); setData(null) }}
              style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                border: selected === r.id ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border)',
                background: selected === r.id ? 'var(--accent-muted)' : 'var(--bg-card)',
                color: selected === r.id ? 'var(--accent)' : 'var(--text-primary)',
                cursor: 'pointer', transition: 'var(--transition)'
              }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: selected === r.id ? 'var(--accent)' : 'var(--text-muted)', marginTop: 2 }}>{r.desc}</div>
            </button>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Filters */}
          <div className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              {selected === 'customer_ledger' && (
                <div className="form-group" style={{ minWidth: 200 }}>
                  <label className="form-label">Customer *</label>
                  <select className="select" value={filters.customerId} onChange={e => setF('customerId', e.target.value)}>
                    <option value="">— Select —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                  </select>
                </div>
              )}
              {(selected === 'delivery_report' || selected === 'payment_history') && selected !== 'customer_ledger' && (
                <div className="form-group" style={{ minWidth: 180 }}>
                  <label className="form-label">Customer</label>
                  <select className="select" value={filters.customerId} onChange={e => setF('customerId', e.target.value)}>
                    <option value="">All Customers</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                  </select>
                </div>
              )}
              {selected === 'delivery_report' && (
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label className="form-label">Employee</label>
                  <select className="select" value={filters.employeeId} onChange={e => setF('employeeId', e.target.value)}>
                    <option value="">All Employees</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name}</option>)}
                  </select>
                </div>
              )}
              {selected === 'payment_history' && (
                <div className="form-group" style={{ minWidth: 150 }}>
                  <label className="form-label">Method</label>
                  <select className="select" value={filters.method} onChange={e => setF('method', e.target.value)}>
                    <option value="">All Methods</option>
                    {['cash','bank_transfer','cheque','upi'].map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                  </select>
                </div>
              )}
              {selected !== 'pending_balance' && (
                <>
                  <div className="form-group">
                    <label className="form-label">From Date</label>
                    <input className="input" type="date" value={filters.from} onChange={e => setF('from', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date</label>
                    <input className="input" type="date" value={filters.to} onChange={e => setF('to', e.target.value)} />
                  </div>
                </>
              )}
              <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={runReport} disabled={loading}>
                {loading ? 'Generating…' : '▶ Generate'}
              </button>
            </div>
          </div>

          {/* Results */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data && !loading && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rowCount} record{rowCount !== 1 ? 's' : ''} found</span>
              </div>
            )}
            <div className="table-wrap" style={{ flex: 1 }}>
              {renderResults()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}
