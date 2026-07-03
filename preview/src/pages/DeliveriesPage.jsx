import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtWeight, today } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  delivery_date: today(), destination_city: '', destination_state: '',
  customer_id: '', employee_id: '', vehicle_details: '', purpose: '',
  silver_weight_delivered: '', fine_silver_collected: '', travel_expenses: '', notes: ''
}

export default function DeliveriesPage() {
  const { user } = useAuth()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', from: '', to: '', city: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getDeliveries(filters)
    if (res.success) setDeliveries(res.data)
    setLoading(false)
  }, [filters])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    window.api.getCustomers({}).then(r => r.success && setCustomers(r.data))
    window.api.getEmployees({ activeOnly: true }).then(r => r.success && setEmployees(r.data))
  }, [])

  const openNew = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (d) => {
    setForm({
      delivery_date: d.delivery_date, destination_city: d.destination_city || '',
      destination_state: d.destination_state || '', customer_id: d.customer_id || '',
      employee_id: d.employee_id || '', vehicle_details: d.vehicle_details || '',
      purpose: d.purpose || '', silver_weight_delivered: d.silver_weight_delivered || '',
      fine_silver_collected: d.fine_silver_collected || '',
      travel_expenses: d.travel_expenses || '', notes: d.notes || ''
    })
    setEditing(d)
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.delivery_date) return toast.error('Delivery date is required')
    const payload = { ...form, created_by: user?.id }
    const res = editing
      ? await window.api.updateDelivery({ ...payload, id: editing.id })
      : await window.api.createDelivery(payload)
    if (res.success) {
      toast.success(editing ? 'Delivery updated' : 'Delivery logged')
      setModal(false); load()
    } else toast.error(res.error || 'Failed to save')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteDelivery(id)
    if (res.success) { toast.success('Delivery deleted'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const totalExpenses = deliveries.reduce((s, d) => s + (parseFloat(d.travel_expenses) || 0), 0)
  const totalSilverDelivered = deliveries.reduce((s, d) => s + (parseFloat(d.silver_weight_delivered) || 0), 0)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🚚 Delivery & Travel Log</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{deliveries.length} records</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Log Delivery</button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="stats-grid">
          <div className="stat-card"><span className="label">Total Deliveries</span><span className="value text-accent">{deliveries.length}</span></div>
          <div className="stat-card"><span className="label">Silver Delivered</span><span className="value" style={{ color: 'var(--accent)' }}>{fmtWeight(totalSilverDelivered)}</span></div>
          <div className="stat-card"><span className="label">Travel Expenses</span><span className="value" style={{ color: 'var(--info)' }}>₹{totalExpenses.toLocaleString('en-IN')}</span></div>
        </div>

        <div className="filter-row">
          <SearchInput value={filters.search} onChange={v => setF('search', v)} placeholder="Search customer, employee, city…" />
          <input className="input" type="text" style={{ width: 140 }} value={filters.city} onChange={e => setF('city', e.target.value)} placeholder="Filter by city" />
          <input className="input" type="date" style={{ width: 140 }} value={filters.from} onChange={e => setF('from', e.target.value)} />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <input className="input" type="date" style={{ width: 140 }} value={filters.to} onChange={e => setF('to', e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', from: '', to: '', city: '' })}>Clear</button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Destination</th><th>Customer</th><th>Employee</th>
                <th>Vehicle</th><th>Purpose</th><th>Silver Delivered</th>
                <th>Fine Collected</th><th>Expenses</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10}><div className="loading">Loading…</div></td></tr>}
              {!loading && deliveries.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><div className="icon">🚚</div>No delivery records found</div></td></tr>
              )}
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td>{fmtDate(d.delivery_date)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{d.destination_city || '—'}</div>
                    {d.destination_state && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.destination_state}</div>}
                  </td>
                  <td>{d.customer_name || '—'}</td>
                  <td>{d.employee_name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{d.vehicle_details || '—'}</td>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.purpose || '—'}</td>
                  <td style={{ color: 'var(--accent)' }}>{d.silver_weight_delivered ? fmtWeight(d.silver_weight_delivered) : '—'}</td>
                  <td style={{ color: 'var(--success)' }}>{d.fine_silver_collected ? fmtWeight(d.fine_silver_collected) : '—'}</td>
                  <td>{d.travel_expenses ? `₹${parseFloat(d.travel_expenses).toLocaleString('en-IN')}` : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(d)}>✏️</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDelConfirm(d.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Delivery Record' : 'Log New Delivery'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Save Delivery'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Delivery Date *</label>
              <input className="input" type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select className="select" value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Destination City</label>
              <input className="input" value={form.destination_city} onChange={e => set('destination_city', e.target.value)} placeholder="City" />
            </div>
            <div className="form-group">
              <label className="form-label">Destination State</label>
              <input className="input" value={form.destination_state} onChange={e => set('destination_state', e.target.value)} placeholder="State" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee / Person Responsible</label>
              <select className="select" value={form.employee_id} onChange={e => set('employee_id', e.target.value)}>
                <option value="">— Select Employee —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.employee_name} ({e.designation || 'Staff'})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Details</label>
              <input className="input" value={form.vehicle_details} onChange={e => set('vehicle_details', e.target.value)} placeholder="e.g. MH-12-AB-1234, Tempo" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose of Visit</label>
            <input className="input" value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="Delivery purpose / description" />
          </div>
          <div className="form-grid-3">
            <div className="form-group">
              <label className="form-label">Silver Delivered (g)</label>
              <input className="input" type="number" step="0.001" value={form.silver_weight_delivered} onChange={e => set('silver_weight_delivered', e.target.value)} placeholder="0.000" />
            </div>
            <div className="form-group">
              <label className="form-label">Fine Silver Collected (g)</label>
              <input className="input" type="number" step="0.001" value={form.fine_silver_collected} onChange={e => set('fine_silver_collected', e.target.value)} placeholder="0.000" />
            </div>
            <div className="form-group">
              <label className="form-label">Travel Expenses (₹)</label>
              <input className="input" type="number" step="0.01" value={form.travel_expenses} onChange={e => set('travel_expenses', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes" rows={2} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Delete Delivery Record" message="Permanently delete this delivery record?" danger />
    </div>
  )
}
