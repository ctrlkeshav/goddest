import React from 'react'

export default function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>
      <span>Showing {from}–{to} of {total}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>←</button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onChange(p)}>
              {p}
            </button>
          )
        })}
        <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>→</button>
      </div>
    </div>
  )
}
