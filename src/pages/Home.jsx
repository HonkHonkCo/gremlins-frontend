import { useState, useEffect } from 'react'
import { getGremlins } from '../services/api'
import { t } from '../i18n'
import BgAnimation from '../components/BgAnimation'

const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}
const ROLE_COLORS = {
  accountant: '#3ecf70', trainer: '#4a9eff', secretary: '#d4a017', chef: '#ff7043',
}

export default function Home({ userId, lang, onSelect, onAdd, onReport }) {
  const [gremlins, setGremlins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getGremlins(userId)
      .then(data => setGremlins(Array.isArray(data) ? data : []))
      .catch(() => setGremlins([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">{t(lang, 'loading')}</div>

  const allStats = gremlins.flatMap(g => {
    const color = ROLE_COLORS[g.role] || '#d4a017'
    const stats = g.stats || {}
    return Object.entries(stats)
      .filter(([k, v]) => k !== 'last_updated' && v !== 0)
      .slice(0, 2)
      .map(([k, v]) => ({ key: k, value: v, color, gremlin: g.name }))
  }).slice(0, 6)

  const statLabel = (k) => t(lang, 'stats')?.[k] || k

  return (
    <div style={{ padding: '0 12px 12px', position: 'relative' }}>
      <BgAnimation />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {allStats.length > 0 && (
        <div style={{ margin: '12px 0 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {t(lang, 'globalStatus')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {allStats.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg2)', border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color, textShadow: `0 0 10px ${s.color}80` }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : String(s.value).slice(0, 8)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{statLabel(s.key)}</div>
                <div style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 1 }}>{s.gremlin.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ margin: '0 0 8px', borderColor: '#9a7310', cursor: 'pointer' }} onClick={onReport}>
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 4 }}>
          {t(lang, 'weeklyBanner')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
          {t(lang, 'weeklyBannerSub')}
        </div>
      </div>

      <div className="section-label">{t(lang, 'myGremlins')}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gremlins.map(g => {
          const color = ROLE_COLORS[g.role] || '#d4a017'
          const stats = g.stats || {}
          const firstStat = Object.entries(stats).find(([k, v]) => k !== 'last_updated' && v !== 0)
          return (
            <div key={g.id} className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderColor: `${color}30` }}
              onClick={() => onSelect(g)}>
              <div style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${color}60`, boxShadow: `0 0 8px ${color}30`, flexShrink: 0, overflow: 'hidden', background: 'var(--bg3)' }}>
                <img src={`/gremlins/${g.role}.png`} alt={g.role} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{g.name}</div>
                <div style={{ fontSize: 10, color, marginTop: 2 }}>{t(lang, g.role) || g.role}</div>
                {firstStat && (
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {statLabel(firstStat[0])}: <span style={{ color, textShadow: `0 0 6px ${color}60` }}>{String(firstStat[1])}</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>›</div>
            </div>
          )
        })}

        <button onClick={onAdd} style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-dim)', fontSize: 11, width: '100%', fontFamily: 'inherit', cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--text-muted)', flexShrink: 0 }}>+</div>
          <span>{t(lang, 'addGremlin')}</span>
        </button>
      </div>
      </div>
    </div>
  )
}
