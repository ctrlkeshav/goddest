import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { fmtWeight, fmtDate, txnTypeLabel, txnTypeBadge } from '../utils/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

const chartOpts = (title) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } }, title: { display: false } },
  scales: {
    x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } }
  }
})

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [monthly, setMonthly] = useState([])
  const [payTrends, setPayTrends] = useState([])
  const [recent, setRecent] = useState([])
  const [topPending, setTopPending] = useState([])
  const [custBalances, setCustBalances] = useState([])

  useEffect(() => {
    window.api.getDashboardStats().then(r => r.success && setStats(r.data))
    window.api.getMonthlyMovement().then(r => r.success && setMonthly(r.data))
    window.api.getPaymentTrends().then(r => r.success && setPayTrends(r.data))
    window.api.getRecentTransactions().then(r => r.success && setRecent(r.data))
    window.api.getTopPendingCustomers().then(r => r.success && setTopPending(r.data))
    window.api.getCustomerBalances().then(r => r.success && setCustBalances(r.data))
  }, [])

  const monthlyChartData = {
    labels: monthly.map(m => m.month),
    datasets: [
      { label: 'Silver Issued (g)', data: monthly.map(m => m.issued), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
      { label: 'Fine Received (g)', data: monthly.map(m => m.received), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 }
    ]
  }

  const payChartData = {
    labels: payTrends.map(m => m.month),
    datasets: [
      { label: 'Payments (₹)', data: payTrends.map(m => m.amount), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', tension: 0.4, fill: true, pointBackgroundColor: '#3b82f6' }
    ]
  }

  const custChartData = {
    labels: custBalances.slice(0, 6).map(c => c.customer_name.split(' ')[0]),
    datasets: [
      { label: 'Pending Balance (g)', data: custBalances.slice(0, 6).map(c => parseFloat(c.balance).toFixed(3)), backgroundColor: 'rgba(239,68,68,0.6)', borderRadius: 4 }
    ]
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/transactions')}>
          + New Transaction
        </button>
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stat Cards */}
        <div className="stats-grid">
          <StatCard label="Total Silver Issued" value={fmtWeight(stats?.total_silver_issued)} icon="⬆️" cls="stat-accent" sub="Gross weight" />
          <StatCard label="Fine Silver Received" value={fmtWeight(stats?.total_fine_received)} icon="⬇️" cls="stat-green" sub="Total returned" />
          <StatCard label="Pending Fine Silver" value={fmtWeight(stats?.total_pending_fine)} icon="⏳" cls="stat-red" sub="Outstanding balance" />
          <StatCard label="Total Payments" value={stats ? `₹${parseFloat(stats.total_payments || 0).toLocaleString('en-IN')}` : '—'} icon="💳" cls="stat-blue" sub="All time" />
          <StatCard label="Deliveries This Month" value={stats?.deliveries_this_month ?? '—'} icon="🚚" cls="" sub="Current month" />
          <StatCard label="Total Customers" value={stats?.total_customers ?? '—'} icon="👥" cls="" sub="Active accounts" />
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem' }}>📈 Monthly Silver Movement</h3>
            <div style={{ height: 200 }}>
              {monthly.length ? <Bar data={monthlyChartData} options={chartOpts()} /> : <Empty />}
            </div>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem' }}>💳 Payment Trends</h3>
            <div style={{ height: 200 }}>
              {payTrends.length ? <Line data={payChartData} options={chartOpts()} /> : <Empty />}
            </div>
          </div>
        </div>

        {/* Charts Row 2 + Top Pending */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ marginBottom: 14, fontSize: '0.9rem' }}>📊 Customer-wise Balance</h3>
            <div style={{ height: 200 }}>
              {custBalances.length ? <Bar data={custChartData} options={{ ...chartOpts(), indexAxis: 'y' }} /> : <Empty />}
            </div>
          </div>

          <div className="card">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.9rem' }}>🔴 Top Pending Customers</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/reports')}>View Report →</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPending.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pending balances</p>}
              {topPending.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, cursor: 'pointer' }}
                  onClick={() => navigate('/customers')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{c.customer_name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.city || '—'}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 12 }}>{fmtWeight(c.pending_fine)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.9rem' }}>🕐 Recent Transactions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>View All →</button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>TXN ID</th><th>Date</th><th>Customer</th><th>Type</th>
                  <th>Silver Issued</th><th>Fine Received</th><th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No transactions yet</td></tr>
                )}
                {recent.map(t => (
                  <tr key={t.id}>
                    <td><span className="font-mono text-sm text-accent">{t.transaction_id}</span></td>
                    <td>{fmtDate(t.transaction_date)}</td>
                    <td>{t.customer_name}</td>
                    <td><span className={`badge ${txnTypeBadge(t.transaction_type)}`}>{txnTypeLabel(t.transaction_type)}</span></td>
                    <td>{t.gross_silver_given ? fmtWeight(t.gross_silver_given) : '—'}</td>
                    <td>{t.fine_silver_received ? fmtWeight(t.fine_silver_received) : '—'}</td>
                    <td style={{ color: t.balance_fine_silver > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {fmtWeight(t.balance_fine_silver)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, cls, sub }) {
  return (
    <div className={`stat-card ${cls}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="label">{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="value" style={{ color: cls === 'stat-red' ? 'var(--danger)' : cls === 'stat-green' ? 'var(--success)' : cls === 'stat-blue' ? 'var(--accent-2)' : 'var(--accent)' }}>{value ?? '—'}</div>
      <div className="sub">{sub}</div>
    </div>
  )
}

function Empty() {
  return <div className="flex-center" style={{ height: '100%', color: 'var(--text-muted)', fontSize: 12 }}>No data yet</div>
}
