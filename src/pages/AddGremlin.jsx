import { useState } from 'react'
import { createGremlin } from '../services/api'
import { t } from '../i18n'
import Upgrade from './Upgrade'

const ROLES = [
  { id: 'accountant', icon: '🧮' },
  { id: 'trainer', icon: '🏋️' },
  { id: 'secretary', icon: '📋' },
  { id: 'chef', icon: '🍽️' },
]

export default function AddGremlin({ userId, user, lang, onBack, onCreated }) {
  const [role, setRole] = useState('accountant')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const create = async () => {
    if (!name.trim()) { setError(t(lang, 'nameRequired')); return }
    setLoading(true); setError('')
    try {
      await createGremlin({ user_id: userId, role, name: name.trim(), description: description.trim() })
      onCreated()
    } catch(err) {
      const data = err?.response?.data
      if (data?.error === 'limit_reached') {
        setShowUpgrade(true)
      } else {
        setError(t(lang, 'errorCreate'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {showUpgrade && (
        <Upgrade lang={lang} reason="limit_reached" user={user} onClose={(paid) => {
          setShowUpgrade(false)
          if (paid) window.location.reload()
        }} />
      )}

      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>← {t(lang, 'cancel')}</button>
        <span className="topbar-title">{t(lang, 'newGremlin')}</span>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
            {t(lang, 'chooseRole')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)} style={{
                background: role === r.id ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${role === r.id ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 10, padding: '10px 8px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, margin: '0 auto 6px', overflow: 'hidden', border: `1px solid ${role === r.id ? 'var(--gold)' : 'var(--border)'}`, background: 'var(--bg2)' }}>
                  <img src={`/gremlins/${r.id}.png`} alt={r.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML = r.icon }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{t(lang, r.id)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{t(lang, r.id + 'Desc')}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {t(lang, 'gremlinName')}
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, 'namePlaceholder')} />
        </div>

        <div>
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {t(lang, 'description')}
          </div>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={t(lang, 'descPlaceholder')} />
        </div>

        {error && (
          <div style={{ fontSize: 11, color: 'var(--red)', padding: '6px 10px', background: 'var(--red-bg)', borderRadius: 6 }}>
            {error}
          </div>
        )}

        <button className="btn-gold" onClick={create} disabled={loading}>
          {loading ? t(lang, 'creating') : t(lang, 'createButton')}
        </button>
      </div>
    </div>
  )
}
