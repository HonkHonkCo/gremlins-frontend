import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat, updateGremlin, deleteGremlin, getGremlin } from '../services/api'
import { t } from '../i18n'
import Upgrade from './Upgrade'
import GremlinAnimation from '../components/GremlinAnimation'

const ROLE_COLOR_VARIANTS = {
  accountant: ['#3ecf70', '#00ddaa', '#aaff44', '#00ffcc'],
  trainer:    ['#4a9eff', '#aa44ff', '#00ccff', '#ff44aa'],
  secretary:  ['#d4a017', '#ff6600', '#ffdd00', '#dd4488'],
  chef:       ['#ff7043', '#ff2288', '#ffaa00', '#ff44cc'],
}

const ROLE_LABELS = {
  accountant: 'Бухгалтер', trainer: 'Тренер', secretary: 'Секретарь', chef: 'Шеф-повар',
}

// Человекочитаемые названия статов по роли
const STAT_LABELS_RU = {
  // accountant
  expense_thb: 'расходы ฿',
  expense_rub: 'расходы ₽',
  expense_usd: 'расходы $',
  income_thb: 'доходы ฿',
  income_rub: 'доходы ₽',
  income_usd: 'доходы $',
  balance_thb: 'баланс ฿',
  balance_rub: 'баланс ₽',
  balance_usd: 'баланс $',
  investment_rub: 'инвест ₽',
  investment_usd: 'инвест $',
  // trainer
  last_calories: 'ккал',
  last_workout: 'тренировка',
  last_water: 'вода (л)',
  weight_kg: 'вес (кг)',
  steps: 'шаги',
  last_pushups: 'отжимания',
  last_distance_km: 'дистанция км',
  // secretary
  pending_tasks: 'задач',
  last_task: 'задача',
  next_deadline: 'дедлайн',
  // chef
  last_meal: 'блюдо',
  last_protein: 'белок (г)',
}

const STAT_LABELS_EN = {
  expense_thb: 'expenses ฿',
  expense_rub: 'expenses ₽',
  expense_usd: 'expenses $',
  income_thb: 'income ฿',
  income_rub: 'income ₽',
  income_usd: 'income $',
  balance_thb: 'balance ฿',
  balance_rub: 'balance ₽',
  balance_usd: 'balance $',
  investment_rub: 'invest ₽',
  investment_usd: 'invest $',
  last_calories: 'kcal',
  last_workout: 'workout',
  last_water: 'water (L)',
  weight_kg: 'weight kg',
  steps: 'steps',
  last_pushups: 'pushups',
  last_distance_km: 'distance km',
  pending_tasks: 'tasks',
  last_task: 'task',
  next_deadline: 'deadline',
  last_meal: 'meal',
  last_protein: 'protein (g)',
}

// Приоритет показа статов по роли — самые важные первыми
const STAT_PRIORITY = {
  accountant: ['balance_thb', 'balance_rub', 'expense_thb', 'expense_rub', 'income_thb', 'income_rub'],
  trainer: ['last_workout', 'last_distance_km', 'last_pushups', 'weight_kg', 'last_calories', 'steps'],
  secretary: ['pending_tasks', 'next_deadline', 'last_task'],
  chef: ['last_meal', 'last_calories', 'last_protein'],
}

function getAccentColor(role, gremlinId) {
  const variants = ROLE_COLOR_VARIANTS[role] || ['#d4a017']
  if (!gremlinId || variants.length === 1) return variants[0]
  const seg = gremlinId.replace(/-/g, '')
  const last8 = seg.slice(-8)
  const num = parseInt(last8, 16) || 0
  return variants[num % variants.length]
}

function getPriorityStats(stats, role) {
  const priority = STAT_PRIORITY[role] || []
  const result = []

  // Сначала добавляем по приоритету
  for (const key of priority) {
    const val = stats[key]
    if (val !== undefined && val !== null && val !== 0 && val !== '') {
      result.push([key, val])
    }
    if (result.length >= 4) break
  }

  // Если мало — добиваем остальными
  if (result.length < 4) {
    for (const [k, v] of Object.entries(stats)) {
      if (k === 'last_updated') continue
      if (result.find(([rk]) => rk === k)) continue
      if (v === null || v === undefined || v === 0 || v === '') continue
      result.push([k, v])
      if (result.length >= 4) break
    }
  }

  return result
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
  const [talking, setTalking] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const accentColor = getAccentColor(gremlin.role, gremlin.id)

  const refreshGremlin = async () => {
    try {
      const updated = await getGremlin(gremlin.id)
      if (updated) setGremlin(updated)
    } catch {}
  }

  const refreshEntries = () =>
    getEntries(gremlin.id)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})

  useEffect(() => {
    refreshEntries()
  }, [gremlin.id])

  // Скролл вниз только при новых сообщениях текущей сессии
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

  const send = async (textOverride, silent = false, isFile = false) => {
    const text = textOverride || input.trim()
    if (!text || sending) return
    if (!textOverride) setInput('')
    if (!silent) setMessages(m => [...m, { role: 'user', text, isFile }])
    setSending(true); setTalking(true)
    try {
      const res = await sendChat(userId, gremlin.id, text, isFile)
      setMessages(m => [...m, { role: 'gremlin', text: res.reply || res.gremlin_reply || '...' }])
      // Обновляем stats сразу из ответа если есть, иначе перечитываем
      if (res.stats) {
        setGremlin(g => ({ ...g, stats: res.stats }))
      } else {
        await refreshGremlin()
      }
      refreshEntries()
    } catch(err) {
      const data = err?.response?.data
      if (data?.error === 'message_limit_reached') {
        setUpgradeReason('message_limit_reached')
        if (!silent) setMessages(m => m.slice(0, -1))
      } else {
        setMessages(m => [...m, { role: 'gremlin', text: t(lang, 'errorChat') }])
      }
    }
    finally { setSending(false); setTimeout(() => setTalking(false), 1000) }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileLoading(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      let summary = ''

      if (ext === 'json') {
        const text = await file.text()
        try {
          const json = JSON.parse(text)
          if (json.messages && Array.isArray(json.messages)) {
            const msgs = json.messages
              .filter(m => m.type === 'message' && m.text)
              .slice(-200)
            const textMsgs = msgs.map(m => {
              const txt = typeof m.text === 'string'
                ? m.text
                : Array.isArray(m.text)
                  ? m.text.map(t => typeof t === 'string' ? t : (t.text || '')).join('')
                  : ''
              return '[' + (m.date || '').slice(0, 10) + '] ' + (m.from || '') + ': ' + txt
            }).join('\n')
            summary = 'Telegram chat export "' + (json.name || file.name) + '".\nLast ' + msgs.length + ' messages:\n\n' + textMsgs.slice(0, 6000)
          } else {
            summary = 'JSON file "' + file.name + '":\n' + JSON.stringify(json, null, 2).slice(0, 4000)
          }
        } catch {
          const raw = await file.text()
          summary = raw.slice(0, 4000)
        }
      } else if (['txt', 'csv', 'html', 'htm'].includes(ext)) {
        const text = await file.text()
        summary = 'File "' + file.name + '" (' + ext.toUpperCase() + '):\n\n' + text.slice(0, 6000)
      } else if (['docx', 'doc'].includes(ext)) {
        summary = 'Word document "' + file.name + '" uploaded. Analyze its likely financial or task content.'
      } else {
        summary = 'File "' + file.name + '" (' + (file.type || ext) + ') uploaded.'
      }

      setMessages(m => [...m, { role: 'user', text: '📎 ' + file.name, isFile: true }])
      await send('Пользователь загрузил файл. Проанализируй и дай краткий итог:\n\n' + summary, true, true)
    } catch {
      setMessages(m => [...m, { role: 'gremlin', text: t(lang, 'errorChat') }])
    }
    finally { setFileLoading(false); e.target.value = '' }
  }

  const stats = gremlin.stats || {}
  const priorityStats = getPriorityStats(stats, gremlin.role)
  const hasStats = priorityStats.length > 0

  // История: entries приходят DESC (новые первые), переворачиваем для показа
  const visibleEntries = entries.filter(e => !e.is_file)
  // Показываем последние 30 в хронологическом порядке (старые сверху, новые снизу)
  const recentEntries = [...visibleEntries.slice(0, 30)].reverse()
  // Архив — старые записи, тоже в хронологии
  const archiveEntries = [...visibleEntries.slice(30)].reverse()

  const statLabel = (k) => {
    const labels = lang === 'ru' ? STAT_LABELS_RU : STAT_LABELS_EN
    return labels[k] || t(lang, 'stats')?.[k] || k
  }

  const formatStatValue = (k, v) => {
    if (typeof v === 'number') {
      // Финансовые — с разделителями
      if (k.includes('expense') || k.includes('income') || k.includes('balance') || k.includes('investment')) {
        return v.toLocaleString('ru-RU')
      }
      return v.toLocaleString()
    }
    return String(v).slice(0, 14)
  }

  return (
    <>
      {upgradeReason && (
        <Upgrade lang={lang} reason={upgradeReason} user={user} onClose={(paid) => {
          setUpgradeReason(null)
          if (paid) window.location.reload()
        }} />
      )}

      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)',
        zIndex: 50,
      }}>

        {/* HEADER */}
        <div style={{
          background: 'var(--bg2)', borderBottom: '1px solid ' + accentColor + '30',
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <button onClick={onBack} style={{ color: accentColor, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'ru' ? '← назад' : '← back'}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gremlin.name}</div>
            <div style={{ fontSize: 11, color: accentColor }}>{ROLE_LABELS[gremlin.role] || gremlin.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setEditing(v => !v); setEditName(gremlin.name); setEditDesc(gremlin.description || ''); setConfirmDelete(false) }}
              style={{ background: editing ? accentColor + '20' : 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 6, padding: '4px 8px', fontSize: 14, color: accentColor, cursor: 'pointer', fontFamily: 'inherit' }}
            >✏️</button>
            {archiveEntries.length > 0 && (
              <button
                onClick={() => setShowArchive(v => !v)}
                style={{ background: showArchive ? accentColor + '20' : 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 6, padding: '4px 8px', fontSize: 10, color: accentColor, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {showArchive ? t(lang, 'hide') : t(lang, 'archive') + ' (' + archiveEntries.length + ')'}
              </button>
            )}
          </div>
        </div>

        {/* EDIT PANEL */}
        {editing && (
          <div style={{ background: 'var(--bg2)', borderBottom: '1px solid ' + accentColor + '30', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: accentColor, letterSpacing: '0.1em' }}>{t(lang, 'edit')}</div>
            <input value={editName} onChange={e => setEditName(e.target.value)} placeholder={t(lang, 'namePlaceholder')}
              style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            <textarea rows={2} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder={t(lang, 'descPlaceholder')}
              style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none', resize: 'none' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={saveEdit} disabled={saving || !editName.trim()} style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 6, padding: '7px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flex: 1 }}>
                {saving ? t(lang, 'saving') : t(lang, 'save')}
              </button>
              <button onClick={() => { setEditing(false); setConfirmDelete(false) }} style={{ background: 'var(--bg3)', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {t(lang, 'cancel')}
              </button>
              <button onClick={handleDelete} style={{ background: confirmDelete ? '#e24b4a' : 'var(--bg3)', color: confirmDelete ? '#fff' : '#e24b4a', border: '1px solid #e24b4a', borderRadius: 6, padding: '7px 10px', fontSize: confirmDelete ? 10 : 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                {confirmDelete ? t(lang, 'confirmDelete') : '🗑'}
              </button>
            </div>
          </div>
        )}

        {/* PORTRAIT + STATS */}
        <div style={{ flexShrink: 0, marginTop: 5 }}>
          <GremlinAnimation role={gremlin.role} accentColor={accentColor} talking={talking} size={220} />
          {hasStats && (
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {priorityStats.map(([k, v]) => (
                <div key={k} style={{ background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '5px 10px', textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, textShadow: '0 0 8px ' + accentColor + '80' }}>
                    {formatStatValue(k, v)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{statLabel(k)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHAT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* АРХИВ — старые записи, хронологически */}
          {showArchive && archiveEntries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>— {t(lang, 'archive')} —</div>
              {archiveEntries.map(e => (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '80%', background: accentColor + '50', color: 'var(--text)', borderRadius: '10px 10px 2px 10px', padding: '7px 11px', fontSize: 13, lineHeight: 1.55, opacity: 0.8 }}>
                      {e.content}
                    </div>
                  </div>
                  {e.reply && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ maxWidth: '80%', background: 'var(--bg3)', color: 'var(--text-dim)', border: '1px solid ' + accentColor + '20', borderRadius: '10px 10px 10px 2px', padding: '7px 11px', fontSize: 13, lineHeight: 1.55 }}>
                        {e.reply}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>— {lang === 'ru' ? 'последние' : 'recent'} —</div>
            </div>
          )}

          {/* ИСТОРИЯ — хронологически (старые сверху, новые снизу) */}
          {recentEntries.map(e => (
            <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '80%', background: accentColor, color: '#000', borderRadius: '12px 12px 2px 12px', padding: '9px 13px', fontSize: 14, lineHeight: 1.55 }}>
                  {e.content}
                </div>
              </div>
              {e.reply && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '80%', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid ' + accentColor + '30', borderRadius: '12px 12px 12px 2px', padding: '9px 13px', fontSize: 14, lineHeight: 1.55 }}>
                    {e.reply}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* НОВЫЕ СООБЩЕНИЯ текущей сессии */}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%',
                background: m.role === 'user'
                  ? (m.isFile ? accentColor + '40' : accentColor)
                  : 'var(--bg2)',
                color: m.role === 'user' ? (m.isFile ? 'var(--text)' : '#000') : 'var(--text)',
                border: m.role === 'gremlin' ? '1px solid ' + accentColor + '30' : 'none',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '9px 13px', fontSize: 14, lineHeight: 1.55,
                fontStyle: m.isFile ? 'italic' : 'normal',
              }}>{m.text}</div>
            </div>
          ))}

          {(sending || fileLoading) && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ background: 'var(--bg2)', border: '1px solid ' + accentColor + '30', borderRadius: '12px 12px 12px 2px', padding: '9px 14px', fontSize: 14, color: 'var(--text-muted)' }}>
                {fileLoading ? t(lang, 'readingFile') : '...'}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderTop: '1px solid ' + accentColor + '30', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <input ref={fileRef} type="file" accept=".csv,.txt,.json,.html,.htm,.docx,.doc" onChange={handleFile} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sending || fileLoading}
            style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', flexShrink: 0, color: accentColor, opacity: sending ? 0.5 : 1 }}
          >📎</button>
          <textarea
            rows={3}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t(lang, 'writeTo') + ' ' + gremlin.name + '...'}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5 }}
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            style={{ background: input.trim() ? accentColor : 'var(--bg3)', color: input.trim() ? '#000' : 'var(--text-muted)', borderRadius: 8, padding: '10px 16px', fontSize: 16, fontWeight: 700, transition: 'all 0.15s', flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >▸</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
