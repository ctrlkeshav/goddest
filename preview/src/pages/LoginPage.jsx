import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) return toast.error('Please fill all fields')
    setLoading(true)
    const res = await login(form.username, form.password)
    setLoading(false)
    if (!res.success) toast.error(res.error || 'Login failed')
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)'
      }} />

      <div style={{ width: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
            marginBottom: 16,
            boxShadow: '0 0 40px rgba(245,158,11,0.25)',
            border: '2px solid rgba(245,158,11,0.3)',
            overflow: 'hidden'
          }}>
            <img
              src="./logo02.png"
              alt="Goddest Metals"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={e => { e.target.style.display='none'; e.target.parentNode.textContent='⚗️' }}
            />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Goddest Metals</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Silver Transaction Management</p>
        </div>

        {/* Card */}
        <div className="card" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
          <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Sign in to your account</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="input"
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          Goddest Metals Company © {new Date().getFullYear()} · Offline Mode
        </p>
      </div>
    </div>
  )
}
