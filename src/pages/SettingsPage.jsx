import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import ConfirmDialog from '../components/UI/ConfirmDialog'
import { fmtDateTime } from '../utils/format'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState('account')
  const [users, setUsers] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [userModal, setUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', full_name: '', password: '', role: 'staff', can_add_transaction: true, can_edit_record: true })
  const [delConfirm, setDelConfirm] = useState(null)
  const [paths, setPaths] = useState(null)

  useEffect(() => {
    if (tab === 'users' && isAdmin) loadUsers()
    if (tab === 'activity') loadActivity()
    if (tab === 'about') window.api.getPaths().then(p => setPaths(p))
  }, [tab])

  const loadUsers = async () => {
    const res = await window.api.getUsers()
    if (res.success) setUsers(res.data)
  }

  const loadActivity = async () => {
    const res = await window.api.getActivityLog({})
    if (res.success) setActivityLog(res.data)
  }

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) return toast.error('Fill all fields')
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    const res = await window.api.changePassword({ userId: user.id, oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
    if (res.success) { toast.success('Password changed successfully'); setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }) }
    else toast.error(res.error || 'Failed')
  }

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) return toast.error('Fill all required fields')
    const res = await window.api.createUser(newUser)
    if (res.success) { toast.success('User created'); setUserModal(false); setNewUser({ username: '', full_name: '', password: '', role: 'staff', can_add_transaction: true, can_edit_record: true }); loadUsers() }
    else toast.error(res.error || 'Failed')
  }

  const handleDeleteUser = async (id) => {
    if (id === user.id) return toast.error("You can't deactivate yourself")
    const res = await window.api.deleteUser(id)
    if (res.success) { toast.success('User deactivated'); loadUsers() }
    else toast.error(res.error)
  }

  const TABS = [
    { id: 'account', label: '👤 My Account' },
    ...(isAdmin ? [{ id: 'users', label: '👥 User Management' }] : []),
    { id: 'activity', label: '📋 Activity Log' },
    { id: 'about', label: 'ℹ️ About' },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <h1>⚙️ Settings</h1>
      </div>

      <div className="page-content" style={{ display: 'flex', gap: 20, height: '100%' }}>
        {/* Tabs */}
        <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                textAlign: 'left', padding: '9px 12px', borderRadius: 8, border: 'none',
                background: tab === t.id ? 'var(--accent-muted)' : 'transparent',
                color: tab === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'var(--transition)'
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 500 }}>
              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Profile</h3>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#000' }}>
                    {user?.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user?.username} · {user?.role}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <InfoItem label="Username" value={user?.username} />
                  <InfoItem label="Role" value={user?.role === 'admin' ? '🔑 Admin' : '👤 Staff'} />
                  <InfoItem label="Last Login" value={fmtDateTime(user?.last_login)} />
                  <InfoItem label="Status" value="✅ Active" />
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: 14 }}>Change Password</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input className="input" type="password" value={pwForm.oldPassword} onChange={e => setPwForm(p => ({ ...p, oldPassword: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input className="input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" onClick={handleChangePassword}>Update Password</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem' }}>User Accounts</h2>
                <button className="btn btn-primary btn-sm" onClick={() => setUserModal(true)}>+ Add User</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Permissions</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                        <td><span className="font-mono text-sm">@{u.username}</span></td>
                        <td><span className={`badge ${u.role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>{u.role}</span></td>
                        <td>
                          {u.role !== 'admin' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className={`badge ${u.can_add_transaction ? 'badge-green' : 'badge-red'}`}
                                style={{ border: 'none', cursor: 'pointer', fontSize: 10 }}
                                onClick={async () => {
                                  await window.api.updatePermissions({ userId: u.id, can_add_transaction: !u.can_add_transaction, can_edit_record: !!u.can_edit_record })
                                  loadUsers()
                                }}>
                                {u.can_add_transaction ? '✓' : '✕'} Add TXN
                              </button>
                              <button
                                className={`badge ${u.can_edit_record ? 'badge-green' : 'badge-red'}`}
                                style={{ border: 'none', cursor: 'pointer', fontSize: 10 }}
                                onClick={async () => {
                                  await window.api.updatePermissions({ userId: u.id, can_add_transaction: !!u.can_add_transaction, can_edit_record: !u.can_edit_record })
                                  loadUsers()
                                }}>
                                {u.can_edit_record ? '✓' : '✕'} Edit
                              </button>
                            </div>
                          )}
                          {u.role === 'admin' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Full access</span>}
                        </td>
                        <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(u.last_login)}</td>
                        <td>
                          {u.id !== user.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => setDelConfirm(u.id)}>Deactivate</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 style={{ fontSize: '1rem' }}>Activity Log</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
                  <tbody>
                    {activityLog.length === 0 && (
                      <tr><td colSpan={5}><div className="empty-state" style={{ padding: 24 }}>No activity recorded</div></td></tr>
                    )}
                    {activityLog.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(a.created_at)}</td>
                        <td>{a.full_name || a.username}</td>
                        <td><span className="badge badge-blue">{a.action}</span></td>
                        <td><span className="badge badge-gray">{a.module}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 520 }}>
              <div className="card" style={{ textAlign: 'center', borderColor: 'rgba(245,158,11,0.3)' }}>
                <div style={{ fontSize: 52, marginBottom: 10 }}>⚗️</div>
                <h1 style={{ fontSize: '1.4rem', marginBottom: 4 }}>Goddest Metals Company</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Silver Transaction Management Software</p>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 12 }}>
                  <span className="badge badge-amber">Version 1.0.0</span>
                  <span className="badge badge-green">Offline Mode</span>
                </div>
              </div>
              {paths && (
                <div className="card">
                  <h3 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Data Storage Locations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <PathItem label="Database" path={paths.userDataPath} />
                    <PathItem label="Documents" path={paths.documentsPath} />
                    <PathItem label="Backups" path={paths.backupPath} />
                  </div>
                </div>
              )}
              <div className="card">
                <h3 style={{ marginBottom: 12, fontSize: '0.9rem' }}>Built With</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Electron', 'React', 'SQLite', 'Chart.js', 'XLSX', 'Archiver'].map(t => (
                    <span key={t} className="badge badge-blue">{t}</span>
                  ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                  Designed for silver manufacturing, refining, and customer metal accounting workflows.
                  100% offline — no internet connection required.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New User Modal */}
      <Modal open={userModal} onClose={() => setUserModal(false)} title="Create New User"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setUserModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateUser}>Create User</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="input" value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="input" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value.toLowerCase() }))} placeholder="login username" />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="input" type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="select" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {newUser.role === 'staff' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PERMISSIONS</p>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newUser.can_add_transaction} onChange={e => setNewUser(p => ({ ...p, can_add_transaction: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
                Can Add Transactions
              </label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={newUser.can_edit_record} onChange={e => setNewUser(p => ({ ...p, can_edit_record: e.target.checked }))} style={{ accentColor: 'var(--accent)' }} />
                Can Edit Records
              </label>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!delConfirm} onClose={() => setDelConfirm(null)}
        onConfirm={() => handleDeleteUser(delConfirm)}
        title="Deactivate User" message="This will deactivate the user account. They won't be able to log in." danger />
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
}

function PathItem({ label, path }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{path}</span>
    </div>
  )
}
