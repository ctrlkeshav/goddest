import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Layout.css'

const NAV = [
  { path: '/', icon: '⬛', label: 'Dashboard', exact: true },
  { path: '/customers', icon: '👥', label: 'Customers' },
  { path: '/transactions', icon: '⚖️', label: 'Transactions' },
  { path: '/payments', icon: '💳', label: 'Payments' },
  { path: '/deliveries', icon: '🚚', label: 'Deliveries' },
  { path: '/employees', icon: '👤', label: 'Employees' },
  { path: '/documents', icon: '📁', label: 'Documents' },
  { path: '/reports', icon: '📊', label: 'Reports' },
  { path: '/backup', icon: '💾', label: 'Backup' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">
              <img src="./logo02.png" alt="Goddest Metals" onError={e => { e.target.style.display='none'; e.target.parentNode.textContent='⚗️' }} />
            </div>
            {!collapsed && (
              <div className="logo-text">
                <span className="logo-name">Goddest Metals</span>
                <span className="logo-sub">Silver Management</span>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-icon collapse-btn" onClick={() => setCollapsed(p => !p)}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && (
            <div className="user-info">
              <div className="user-avatar">{user?.full_name?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div className="user-name">{user?.full_name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            </div>
          )}
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout" style={{ marginLeft: collapsed ? 'auto' : 0 }}>
            🚪
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
