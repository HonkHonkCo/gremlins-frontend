import { useState } from 'react'
import { createGremlin } from '../services/api'

const ROLES = [
  { id: 'accountant', icon: '🧮', name: 'Бухгалтер', desc: 'расходы и доходы' },
  { id: 'trainer',    icon: '🏋️', name: 'Тренер',    desc: 'форма и питание' },
  { id: 'secretary',  icon: '📋', name: 'Секретарь',  desc: 'дела и дедлайны' },
  { id: 'chef',       icon: '🍽️', name: 'Шеф',        desc: 'меню и диета' },
]

export default function AddGremlin({ userId, onBack, onCreated }) {
  const [role, setRole] = useState('accountant')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!name.trim()) { setError('Введи имя гремлина'); return }
    setLoading(true)
    setError('')
    try {
      await createGremlin({ user_id: userId, role, name: name.trim(), description: description.trim() })
      onCreated()
    } catch (e) {
      setError('Ошибка создания. Попробуй снова.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>← назад</button>
        <span className="topbar-title">НОВЫЙ ГРЕМЛИН</span>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>ВЫБЕРИ РОЛЬ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                background: role === r.id ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${role === r.id ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{r.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.name}</div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>ИМЯ ГРЕМЛИНА</div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ФИНАНСИСТ, МОЙ БУХГАЛТЕР..." />
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>ОПИСАНИЕ (необязательно)</div>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Что он отслеживает? Какой характер?" />
        </div>

        {error && (
          <div style={{ fontSize: 11, color: 'var(--red)', padding: '6px 10px', background: 'var(--red-bg)', borderRadius: 6 }}>{error}</div>
        )}

        <button className="btn-gold" onClick={create} disabled={loading}>
          {loading ? 'СОЗДАЁМ...' : '◈ СОЗДАТЬ ГРЕМЛИНА'}
        </button>
      </div>
    </div>
  )
}
