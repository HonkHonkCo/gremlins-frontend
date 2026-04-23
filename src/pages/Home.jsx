import { useState, useEffect } from 'react'
import { getGremlins } from '../services/api'

const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}
const ROLE_LABELS = {
  accountant: 'Бухгалтер', trainer: 'Тренер', secretary: 'Секретарь', chef: 'Шеф-повар',
}
const ROLE_COLORS = {
  accountant: '#3ecf70', trainer: '#4a9eff', secretary: '#d4a017', chef: '#ff7043',
}

export default function Home({ userId, onSelect, onAdd, onReport }) {
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

  // Собираем общий статус со всех гремлинов
  const allStats = gremlins.flatMap(g => {
    const color = ROLE_COLORS[g.role] || '#d4a017'
    const stats = g.stats || {}
    return Object.entries(stats)
      .filter(([k]) => k !== 'last_updated')
      .slice(0, 2)
      .map(([k, v]) => ({ key: k, value: v, color, gremlin: g.name }))
  }).slice(0, 6)

  return (
    <div style={{ padding: '0 12px 12px' }}>

      {/* Global status */}
      {allStats.length > 0 && (
        <div style={{ margin: '12px 0 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
            ОБЩИЙ СТАТУС
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {allStats.map((s, i) => (
              <div key={i} style={{
                background: 'var(--bg2)',
                border: `1px solid ${s.color}30`,
                borderRadius: 8, padding: '8px'
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: s.color,
                  textShadow: `0 0 10px ${s.color}80`,
                  letterSpacing: '0.02em'
                }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : String(s.value).slice(0, 8)}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.key}
                </div>
                <div style={{ fontSize: 8, color: s.color, opacity: 0.7, marginTop: 1 }}>
                  {s.gremlin.slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly report banner */}
      <div
        className="card"
        style={{ margin: '0 0 8px', borderColor: '#9a7310', cursor: 'pointer' }}
        onClick={onReport}
      >
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 4 }}>
          ▸ ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ
        </div>
        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
          Нажми чтобы увидеть сводку от всех гремлинов
        </div>
      </div>

      <div className="section-label">мои гремлины</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gremlins.map(g => {
          const color = ROLE_COLORS[g.role] || '#d4a017'
          const stats = g.stats || {}
          const firstStat = Object.entries(stats).find(([k]) => k !== 'last_updated')

          return (
            <div
              key={g.id}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                borderColor: `${color}30`
              }}
              onClick={() => onSelect(g)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'var(--bg3)',
                border: `1px solid ${color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0
              }}>
                {ROLE_ICONS[g.role] || '👾'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{g.name}</div>
                <div style={{ fontSize: 10, color: color, marginTop: 2 }}>{ROLE_LABELS[g.role] || g.role}</div>
                {firstStat && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {firstStat[0]}: <span style={{ color, textShadow: `0 0 6px ${color}60` }}>
                      {String(firstStat[1])}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>›</div>
            </div>
          )
        })}

        <button onClick={onAdd} style={{
          background: 'var(--bg2)', border: '1px dashed var(--border)',
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--text-dim)', fontSize: 11, width: '100%',
          fontFamily: 'inherit', cursor: 'pointer'
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
