import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import SearchInput from '../components/UI/SearchInput'
import { fmtDate, fmtWeight } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const EMPTY = { employee_name: '', mobile: '', designation: '', joining_date: '', is_active: 1, notes: '' }
const LOGIN_EMPTY = { username: '', password: '', can_add_transaction: true, can_edit_record: true }

export default function EmployeesPage() {
  const { isAdmin } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [delConfirm, setDelConfirm] = useState(null)
  const [statsModal, setStatsModal] = useState(null)
  const [empStats, setEmpStats] = useState(null)
  const [loginModal, setLoginModal] = useState(null)  // employee object
  const [loginForm, setLoginForm] = useState(LOGIN_EMPTY)
  const [removeLoginConfirm, setRemoveLoginConfirm] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await window.api.getEmployees({ search })
    if (res.success) setEmployees(res.data)
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY); setEditing(null); setModal(true) }
  const openEdit = (e) => {
    setForm({ employee_name: e.employee_name, mobile: e.mobile || '', designation: e.designation || '', joining_date: e.joining_date || '', is_active: e.is_active, notes: e.notes || '' })
    setEditing(e); setModal(true)
  }

  const openLoginModal = (e) => {
    setLoginModal(e)
    setLoginForm({
      username: e.login_username || '',
      password: '',
      can_add_transaction: e.can_add_transaction !== 0,
      can_edit_record: e.can_edit_record !== 0
    })
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

  const handleSaveLogin = async () => {
    if (!loginForm.username.trim()) return toast.error('Username is required')
    if (!loginModal.user_id && !loginForm.password.trim()) return toast.error('Password is required for new login')
    const res = await window.api.assignEmployeeLogin({
      employeeId: loginModal.id,
      username: loginForm.username.toLowerCase().trim(),
      password: loginForm.password || undefined,
      can_add_transaction: loginForm.can_add_transaction,
      can_edit_record: loginForm.can_edit_record
    })
    if (res.success) { toast.success('Login credentials saved'); setLoginModal(null); load() }
    else toast.error(res.error || 'Failed')
  }

  const handleRemoveLogin = async (emp) => {
    const res = await window.api.removeEmployeeLogin(emp.id)
    if (res.success) { toast.success('Login access removed'); load() }
    else toast.error(res.error)
  }

  const handleDelete = async (id) => {
    const res = await window.api.deleteEmployee(id)
    if (res.success) { toast.success('Employee deactivated'); load() }
    else toast.error(res.error)
  }

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setL = (k, v) => setLoginForm(p => ({ ...p, [k]: v }))

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {loading && <div className="loading">Loading…</div>}
          {!loading && employees.length === 0 && (
            <div className="empty-state"><div className="icon">👤</div>No employees found</div>
          )}
          {employees.map(e => (
            <div key={e.id} className="card" style={{ borderColor: e.is_active ? 'var(--border)' : 'rgba(239,68,68,0.2)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', fontSize: 16 }}>
                    {e.employee_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.employee_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.designation || 'Staff'}</div>
                  </div>
                </div>
                <span className={`badge ${e.is_active ? 'badge-green' : 'badge-red'}`}>
                  {e.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <Stat label="Deliveries" value={e.delivery_count || 0} />
                <Stat label="Cities" value={e.cities_visited || 0} />
                <Stat label="Mobile" value={e.mobile || '—'} />
                <Stat label="Joined" value={fmtDate(e.joining_date)} />
              </div>

              {/* Login status */}
              <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg-secondary)', marginBottom: 10 }}>
                {e.login_username ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Login: </span>
                      <span className="font-mono" style={{ fontSize: 12, color: 'var(--success)' }}>@{e.login_username}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className={`badge ${e.can_add_transaction ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                        {e.can_add_transaction ? '✓' : '✕'} Add TXN
                      </span>
                      <span className={`badge ${e.can_edit_record ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                        {e.can_edit_record ? '✓' : '✕'} Edit
                      </span>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔒 No login account</span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openStats(e)}>📊</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️ Edit</button>
                {isAdmin && (
                  <button className="btn btn-secondary btn-sm" onClick={() => openLoginModal(e)}>
                    {e.login_username ? '🔑 Edit Login' : '🔑 Set Login'}
                  </button>
                )}
                {isAdmin && e.login_username && (
                  <button className="btn btn-danger btn-sm" onClick={() => setRemoveLoginConfirm(e)}>
                    Remove Login
                  </button>
                )}
                <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(e.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Update' : 'Add Employee'}</button>
        </>}
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
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={form.is_active} onChange={e => set('is_active', parseInt(e.target.value))}>
                <option value={1}>Active</option><option value={0}>Inactive</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      {/* Login / Permissions Modal */}
      {loginModal && (
        <Modal open={!!loginModal} onClose={() => setLoginModal(null)}
          title={`${loginModal.login_username ? 'Edit' : 'Set'} Login — ${loginModal.employee_name}`}
          footer={<>
            <button className="btn btn-secondary" onClick={() => setLoginModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveLogin}>Save Login</button>
          </>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              ℹ️ This employee will be able to log in using these credentials.
              {loginModal.login_username && ' Leave password blank to keep current password.'}
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input className="input" value={loginForm.username} onChange={e => setL('username', e.target.value.toLowerCase())} placeholder="login username" />
              </div>
              <div className="form-group">
                <label className="form-label">{loginModal.login_username ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input className="input" type="password" value={loginForm.password} onChange={e => setL('password', e.target.value)} placeholder="Min 6 characters" />
              </div>
            </div>

            {/* Permissions */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>🛡️ Permissions (Admin sets these)</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={loginForm.can_add_transaction}
                    onChange={e => setL('can_add_transaction', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Can Add Transactions</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allow creating new silver transactions, payments, deliveries</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={loginForm.can_edit_record}
                    onChange={e => setL('can_edit_record', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Can Edit Records</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Allow editing and deleting existing records</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Modal>
      )}

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
        title="Deactivate Employee" message="This will mark the employee as inactive." danger />

      <ConfirmDialog open={!!removeLoginConfirm} onClose={() => setRemoveLoginConfirm(null)}
        onConfirm={() => { handleRemoveLogin(removeLoginConfirm); setRemoveLoginConfirm(null) }}
        title="Remove Login Access"
        message={`Remove login access for ${removeLoginConfirm?.employee_name}? They will no longer be able to log in.`}
        danger />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
