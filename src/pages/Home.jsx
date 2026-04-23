import { useState, useEffect } from 'react'
import { getGremlins } from '../services/api'

const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}
const ROLE_LABELS = {
  accountant: 'Бухгалтер', trainer: 'Тренер', secretary: 'Секретарь', chef: 'Шеф-повар',
}

export default function Home({ userId, onSelect, onAdd }) {
  const [gremlins, setGremlins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getGremlins(userId)
      .then(data => setGremlins(Array.isArray(data) ? data : []))
      .catch(() => setGremlins([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">ЗАГРУЗКА...</div>

  return (
    <div style={{ padding: '0 12px' }}>
      <div className="card" style={{ margin: '12px 0 8px', borderColor: '#9a7310', cursor: 'pointer' }}>
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 6 }}>▸ ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ</div>
        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
          Нажми чтобы увидеть сводку от всех гремлинов
        </div>
      </div>

      <div className="section-label">мои гремлины</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gremlins.map(g => (
          <div key={g.id} className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => onSelect(g)}>
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0
            }}>{ROLE_ICONS[g.role] || '👾'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{g.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{ROLE_LABELS[g.role] || g.role}</div>
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>›</div>
          </div>
        ))}

        <button onClick={onAdd} style={{
          background: 'var(--bg2)', border: '1px dashed var(--border)',
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--text-dim)', fontSize: 11, width: '100%'
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: 'var(--text-muted)', flexShrink: 0
          }}>+</div>
          <span>добавить гремлина</span>
        </button>
      </div>
    </div>
  )
}
