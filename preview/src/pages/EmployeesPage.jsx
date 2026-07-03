import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtWeight } from '../utils/format'

const EMPTY = {
  employee_name: '', mobile: '', designation: '',
  joining_date: '', is_active: 1, notes: ''
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [statsModal, setStatsModal] = useState(null)
  const [empStats, setEmpStats] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getEmployees({ search })
    if (res.success) setEmployees(res.data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (e) => {
    setForm({ employee_name: e.employee_name, mobile: e.mobile || '', designation: e.designation || '', joining_date: e.joining_date || '', is_active: e.is_active, notes: e.notes || '' })
    setEditing(e); setModal(true)
  }

  const openStats = async (e) => {
    setStatsModal(e)
    const res = await window.api.getEmployeeStats(e.id)
    if (res.success) setEmpStats(res.data)
  }

  const handleSave = async () => {
    if (!form.employee_name.trim()) return toast.error('Employee name is required')
    const res = editing
      ? await window.api.updateEmployee({ ...form, id: editing.id })
      : await window.api.createEmployee(form)
    if (res.success) { toast.success(editing ? 'Employee updated' : 'Employee added'); setModal(false); load() }
    else toast.error(res.error || 'Failed to save')
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteEmployee(id)
    if (res.success) { toast.success('Employee deactivated'); load() }
    else toast.error(res.error)
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👤 Employees</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{employees.length} members</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Add Employee</button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="filter-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, mobile, designation…" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {loading && <div className="loading">Loading…</div>}
          {!loading && employees.length === 0 && (
            <div className="empty-state"><div className="icon">👤</div>No employees found</div>
          )}
          {employees.map(e => (
            <div key={e.id} className="card" style={{ borderColor: e.is_active ? 'var(--border)' : 'rgba(239,68,68,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, color: '#000', fontSize: 16
                  }}>{e.employee_name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.designation || 'Staff'}</div>
                  </div>
                </div>
                <span className={`badge ${e.is_active ? 'badge-green' : 'badge-red'}`}>
                  {e.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <Stat label="Deliveries" value={e.delivery_count || 0} />
                <Stat label="Cities Visited" value={e.cities_visited || 0} />
                <Stat label="Mobile" value={e.mobile || '—'} />
                <Stat label="Joined" value={fmtDate(e.joining_date)} />
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openStats(e)}>📊 Stats</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(e.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Employee'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Employee Name *</label>
              <input className="input" value={form.employee_name} onChange={e => set('employee_name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input className="input" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Designation</label>
              <input className="input" value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Driver, Manager" />
            </div>
            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input className="input" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="select" value={form.is_active} onChange={e => set('is_active', parseInt(e.target.value))}>
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes" rows={2} />
          </div>
        </div>
      </Modal>

      {/* Stats Modal */}
      {statsModal && (
        <Modal open={!!statsModal} onClose={() => { setStatsModal(null); setEmpStats(null) }}
          title={`Stats — ${statsModal.employee_name}`}>
          {!empStats ? <div className="loading">Loading…</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card"><span className="label">Deliveries</span><span className="value text-accent">{empStats.stats?.total_deliveries || 0}</span></div>
                <div className="stat-card"><span className="label">Cities</span><span className="value" style={{ color: 'var(--info)' }}>{empStats.stats?.cities_visited || 0}</span></div>
                <div className="stat-card"><span className="label">Expenses</span><span className="value" style={{ color: 'var(--success)' }}>₹{parseFloat(empStats.stats?.total_expenses || 0).toLocaleString('en-IN')}</span></div>
              </div>
              {empStats.recent_deliveries?.length > 0 && (
                <div>
                  <h3 style={{ marginBottom: 8, fontSize: '0.85rem' }}>Recent Deliveries</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Customer</th><th>City</th><th>Silver</th></tr></thead>
                      <tbody>
                        {empStats.recent_deliveries.map(d => (
                          <tr key={d.id}>
                            <td>{fmtDate(d.delivery_date)}</td>
                            <td>{d.customer_name || '—'}</td>
                            <td>{d.destination_city || '—'}</td>
                            <td>{d.silver_weight_delivered ? fmtWeight(d.silver_weight_delivered) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDelete(delConfirm)}
        title="Deactivate Employee" message="This will mark the employee as inactive. Continue?" danger />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  )
}
