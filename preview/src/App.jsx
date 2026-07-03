import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import CustomersPage from './pages/CustomersPage'
import TransactionsPage from './pages/TransactionsPage'
import DeliveriesPage from './pages/DeliveriesPage'
import EmployeesPage from './pages/EmployeesPage'
import PaymentsPage from './pages/PaymentsPage'
import DocumentsPage from './pages/DocumentsPage'
import ReportsPage from './pages/ReportsPage'
import BackupPage from './pages/BackupPage'
import SettingsPage from './pages/SettingsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="customers"    element={<CustomersPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="payments"     element={<PaymentsPage />} />
        <Route path="deliveries"   element={<DeliveriesPage />} />
        <Route path="employees"    element={<EmployeesPage />} />
        <Route path="documents"    element={<DocumentsPage />} />
        <Route path="reports"      element={<ReportsPage />} />
        <Route path="backup"       element={<BackupPage />} />
        <Route path="settings"     element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ── Preview mode banner ───────────────────────────────────────────────────────
function PreviewBanner() {
  const [hidden, setHidden] = React.useState(false)
  if (hidden) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
      color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      padding: '5px 12px', boxShadow: '0 1px 8px rgba(0,0,0,0.5)'
    }}>
      <span>🔴 PREVIEW MODE</span>
      <span style={{ opacity: 0.8, fontWeight: 400 }}>Data stored in browser localStorage · No Electron · Default login: admin / admin123</span>
      <button onClick={() => setHidden(true)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 4, padding: '1px 8px', cursor: 'pointer', fontSize: 11 }}>✕</button>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PreviewBanner />
      {/* Push content below the banner */}
      <div style={{ paddingTop: 28 }}>
        <AppRoutes />
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)', color: 'var(--text-primary)',
            border: '1px solid var(--border)', fontSize: '13px'
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--danger)',  secondary: '#fff' } },
          duration: 3000
        }}
      />
    </AuthProvider>
  )
}
