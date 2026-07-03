import React from 'react'

export default function SearchInput({ value, onChange, placeholder = 'Search…', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none'
      }}>🔍</span>
      <input
        className="input"
        style={{ paddingLeft: 32, minWidth: 220 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
