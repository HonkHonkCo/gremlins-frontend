import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat, updateGremlin, deleteGremlin } from '../services/api'
import { t } from '../i18n'
import Upgrade from './Upgrade'

const ROLE_COLORS = {
  accountant: '#3ecf70', trainer: '#4a9eff', secretary: '#d4a017', chef: '#ff7043',
}
const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}

export default function GremlinDetail({ gremlin: initialGremlin, userId, user, lang, onBack }) {
  const [gremlin, setGremlin] = useState(initialGremlin)
  const [entries, setEntries] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(initialGremlin.name)
  const [editDesc, setEditDesc] = useState(initialGremlin.description || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const accentColor = ROLE_COLORS[gremlin.role] || '#d4a017'

  useEffect(() => {
    getEntries(gremlin.id).then(data => setEntries(Array.isArray(data) ? data : [])).catch(() => {})
  }, [gremlin.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveEdit = async () => {
    if (!editName.trim()) return
    setSaving(true)
    try {
      const updated = await updateGremlin(gremlin.id, { name: editName.trim(), description: editDesc.trim() })
      setGremlin(g => ({ ...g, name: updated.name || editName.trim(), description: updated.description || editDesc.trim() }))
      setEditing(false); setConfirmDelete(false)
    } catch { alert(t(lang, 'errorSave')) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    try { await deleteGremlin(gremlin.id); onBack() }
    catch { alert(t(lang, 'errorDelete')) }
  }

  const send = async (textOverride) => {
    const text = textOverride || input.trim()
    if (!text || sending) return
    if (!textOverride) setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setSending(true)
    try {
      const res = await sendChat(userId, gremlin.id, text)
      setMessages(m => [...m, { role: 'gremlin', text: res.reply || res.gremlin_reply || '...' }])
      getEntries(gremlin.id).then(data => setEntries(Array.isArray(data) ? data : []))
    } catch(err) {
      const data = err?.response?.data
      if (data?.error === 'message_limit_reached') {
        setUpgradeReason('message_limit_reached')
        setMessages(m => m.slice(0, -1))
      } else {
        setMessages(m => [...m, { role: 'gremlin', text: t(lang, 'errorChat') }])
      }
    }
    finally { setSending(false) }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setFileLoading(true)
    try {
      const text = await file.text()
      const ext = file.name.split('.').pop().toLowerCase()
      const content = ext === 'csv'
        ? `File: ${file.name}\n\nData (CSV):\n${text.split('\n').slice(0, 50).join('\n')}`
        : `File: ${file.name}\n\n${text.slice(0, 2000)}`
      setMessages(m => [...m, { role: 'user', text: `📎 ${file.name}`, isFile: true }])
      await send(content)
    } catch { setMessages(m => [...m, { role: 'gremlin', text: t(lang, 'errorChat') }]) }
    finally { setFileLoading(false); e.target.value = '' }
  }

  const stats = gremlin.stats || {}
  const hasStats = Object.keys(stats).filter(k => k !== 'last_updated' && stats[k] !== 0).length > 0
  const recentEntries = entries.slice(0, 5)
  const archiveEntries = entries.slice(5)
  const statLabel = (k) => t(lang, 'stats')?.[k] || k

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {upgradeReason && (
        <Upgrade lang={lang} reason={upgradeReason} user={user} onClose={(paid) => {
          setUpgradeReason(null)
          if (paid) window.location.reload()
        }} />
      )}

      <div style={{ background: 'var(--bg2)', borderBottom: `1px solid ${accentColor}40`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ color: accentColor, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← {lang === 'ru' ? 'назад' : 'back'}</button>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg3)', border: `1px solid ${accentColor}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          {ROLE_ICONS[gremlin.role] || '👾'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gremlin.name}</div>
          <div style={{ fontSize: 10, color: accentColor, marginTop: 1 }}>{t(lang, gremlin.role) || gremlin.role}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => { setEditing(v => !v); setEditName(gremlin.name); setEditDesc(gremlin.description || ''); setConfirmDelete(false) }} style={{ background: editing ? `${accentColor}20` : 'var(--bg3)', border: `1px solid ${accentColor}40`, borderRadius: 6, padding: '4px 8px', fontSize: 14, color: accentColor, cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
          {archiveEntries.length > 0 && (
            <button onClick={() => setShowArchive(v => !v)} style={{ background: showArchive ? `${accentColor}20` : 'var(--bg3)', border: `1px solid ${accentColor}40`, borderRadius: 6, padding: '4px 8px', fontSize: 9, color: accentColor, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>
              {showArchive ? t(lang, 'hide') : `${t(lang, 'archive')} (${archiveEntries.length})`}
            </button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ background: 'var(--bg2)', borderBottom: `1px solid ${accentColor}30`, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: accentColor, letterSpacing: '0.1em' }}>{t(lang, 'edit')}</div>
          <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t(lang, 'namePlaceholder')}
            style={{ background: 'var(--bg3)', border: `1px solid ${accentColor}40`, borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
          <textarea rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t(lang, 'descPlaceholder')}
            style={{ background: 'var(--bg3)', border: `1px solid ${accentColor}40`, borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none', resize: 'none' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={saveEdit} disabled={saving || !editName.trim()} style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 6, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
              {saving ? t(lang, 'saving') : t(lang, 'save')}
            </button>
            <button onClick={() => { setEditing(false); setConfirmDelete(false) }} style={{ background: 'var(--bg3)', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t(lang, 'cancel')}
            </button>
            <button onClick={handleDelete} style={{ background: confirmDelete ? '#e24b4a' : 'var(--bg3)', color: confirmDelete ? '#fff' : '#e24b4a', border: '1px solid #e24b4a', borderRadius: 6, padding: '7px 10px', fontSize: confirmDelete ? 10 : 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              {confirmDelete ? t(lang, 'confirmDelete') : '🗑'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}30`, borderLeft: `3px solid ${accentColor}`, margin: '8px 12px 0', borderRadius: '0 6px 6px 0', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
        <span style={{ fontSize: 10, color: accentColor, letterSpacing: '0.06em' }}>
          {t(lang, 'youAreWriting')}: {gremlin.name.toUpperCase()}
        </span>
      </div>

      {hasStats && (
        <div style={{ padding: '8px 12px 0' }}>
          <div style={{ background: 'var(--bg2)', border: `1px solid ${accentColor}30`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: accentColor, letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor, boxShadow: `0 0 8px ${accentColor}, 0 0 16px ${accentColor}60` }} />
              {t(lang, 'status')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.entries(stats).filter(([k, v]) => k !== 'last_updated' && v !== 0).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', border: `1px solid ${accentColor}20`, borderRadius: 6, padding: '8px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: accentColor, textShadow: `0 0 10px ${accentColor}80` }}>
                    {typeof v === 'number' ? v.toLocaleString() : String(v)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{statLabel(k)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {showArchive && archiveEntries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>— {t(lang, 'archive')} —</div>
            {archiveEntries.map(e => (
              <div key={e.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '7px 10px', fontSize: 10, color: 'var(--text-muted)', borderLeft: `2px solid ${accentColor}20` }}>
                <span style={{ marginRight: 6, opacity: 0.6 }}>{e.entry_date}</span>{e.content}
              </div>
            ))}
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>———</div>
          </div>
        )}
        {recentEntries.map(e => (
          <div key={e.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '7px 10px', fontSize: 10, color: 'var(--text-dim)', borderLeft: `2px solid ${accentColor}40` }}>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{e.entry_date}</span>{e.content}
          </div>
        ))}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', background: m.role === 'user' ? accentColor : 'var(--bg2)', color: m.role === 'user' ? '#000' : 'var(--text)', border: m.role === 'gremlin' ? `1px solid ${accentColor}30` : 'none', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', fontSize: 12, lineHeight: 1.5 }}>
              {m.text}
            </div>
          </div>
        ))}
        {(sending || fileLoading) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'var(--bg2)', border: `1px solid ${accentColor}30`, borderRadius: '12px 12px 12px 2px', padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
              {fileLoading ? t(lang, 'readingFile') : '...'}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderTop: `1px solid ${accentColor}30`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input ref={fileRef} type="file" accept=".csv,.txt,.json" onChange={handleFile} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={sending || fileLoading} style={{ background: 'var(--bg3)', border: `1px solid ${accentColor}30`, borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', flexShrink: 0, color: accentColor, opacity: sending ? 0.5 : 1 }}>📎</button>
        <textarea rows={2} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={`${t(lang, 'writeTo')} ${gremlin.name}...`}
          style={{ flex: 1, background: 'var(--bg3)', border: `1px solid ${accentColor}30`, borderRadius: 6, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, resize: 'none', outline: 'none' }} />
        <button onClick={() => send()} disabled={sending || !input.trim()} style={{ background: input.trim() ? accentColor : 'var(--bg3)', color: input.trim() ? '#000' : 'var(--text-muted)', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, transition: 'all 0.15s', flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>▸</button>
      </div>
    </div>
  )
}
