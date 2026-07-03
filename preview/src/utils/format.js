export function fmtWeight(val) {
  if (val == null) return '—'
  return `${parseFloat(val).toFixed(3)} g`
}

export function fmtCurrency(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)
}

export function fmtDate(val) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return val }
}

export function fmtDateTime(val) {
  if (!val) return '—'
  try {
    const d = new Date(val)
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return val }
}

export function fmtPct(val) {
  if (val == null) return '—'
  return `${parseFloat(val).toFixed(2)}%`
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function txnTypeLabel(type) {
  const map = {
    silver_issued: 'Silver Issued',
    fine_received: 'Fine Received',
    payment_received: 'Payment Received',
    adjustment: 'Adjustment'
  }
  return map[type] || type
}

export function txnTypeBadge(type) {
  const map = {
    silver_issued: 'badge-amber',
    fine_received: 'badge-green',
    payment_received: 'badge-blue',
    adjustment: 'badge-gray'
  }
  return map[type] || 'badge-gray'
}

export function paymentMethodLabel(m) {
  const map = { cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque', upi: 'UPI' }
  return map[m] || m
}

export function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
