import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat } from '../services/api'

const ROLE_COLORS = {
  accountant: '#3ecf70',
  trainer: '#4a9eff',
  secretary: '#d4a017',
  chef: '#ff7043',
}
const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}
const ROLE_LABELS = {
  accountant: 'Бухгалтер', trainer: 'Тренер', secretary: 'Секретарь', chef: 'Шеф-повар',
}
const STAT_LABELS = {
  today_total: 'сегодня', week_total: 'неделя', last_calories: 'ккал',
  last_workout: 'тренировка', last_water: 'вода', pending_tasks: 'задачи',
  last_task: 'последнее', last_updated: 'обновлено',
}

export default function GremlinDetail({ gremlin, userId, onBack }) {
  const [entries, setEntries] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const accentColor = ROLE_COLORS[gremlin.role] || '#d4a017'

  useEffect(() => {
    getEntries(gremlin.id)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [gremlin.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (textOverride) => {
    const text = textOverride || input.trim()
    if (!text || sending) return
    if (!textOverride) setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setSending(true)
    try {
      const res = await sendChat(userId, gremlin.id, text)
      const reply = res.reply || res.gremlin_reply || '...'
      setMessages(m => [...m, { role: 'gremlin', text: reply }])
    } catch {
      setMessages(m => [...m, { role: 'gremlin', text: 'Что-то пошло не так...' }])
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileLoading(true)

    try {
      const text = await file.text()
      const ext = file.name.split('.').pop().toLowerCase()

      let content = ''
      if (ext === 'csv') {
        const lines = text.split('\n').slice(0, 50)
        content = `Файл: ${file.name}\n\nДанные (CSV):\n${lines.join('\n')}`
      } else {
        content = `Файл: ${file.name}\n\n${text.slice(0, 2000)}`
      }

      setMessages(m => [...m, {
        role: 'user',
        text: `📎 ${file.name}`,
        isFile: true
      }])

      await send(content)
    } catch {
      setMessages(m => [...m, { role: 'gremlin', text: 'Не смог прочитать файл.' }])
    } finally {
      setFileLoading(false)
      e.target.value = ''
    }
  }

  const stats = gremlin.stats || {}
  const hasStats = Object.keys(stats).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        background: 'var(--bg2)',
        borderBottom: `1px solid ${accentColor}40`,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <button onClick={onBack} style={{
          color: accentColor, fontSize: 11, letterSpacing: '0.05em',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit'
        }}>
          ← назад
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--bg3)', border: `1px solid ${accentColor}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0
        }}>
          {ROLE_ICONS[gremlin.role] || '👾'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text)' }}>
            {gremlin.name}
          </div>
          <div style={{ fontSize: 10, color: accentColor, marginTop: 1 }}>
            {ROLE_LABELS[gremlin.role] || gremlin.role}
          </div>
        </div>
      </div>

      {/* WHO YOU'RE TALKING TO banner */}
      <div style={{
        background: `${accentColor}12`,
        border: `1px solid ${accentColor}30`,
        borderLeft: `3px solid ${accentColor}`,
        margin: '8px 12px 0',
        borderRadius: '0 6px 6px 0',
        padding: '6px 10px',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: accentColor,
          boxShadow: `0 0 6px ${accentColor}`,
        }} />
        <span style={{ fontSize: 10, color: accentColor, letterSpacing: '0.06em' }}>
          ТЫ ПИШЕШЬ: {gremlin.name.toUpperCase()}
        </span>
      </div>

      {/* Glowing stats */}
      {hasStats && (
        <div style={{ padding: '8px 12px 0' }}>
          <div style={{
            background: 'var(--bg2)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 8, padding: '10px 12px'
          }}>
            <div style={{
              fontSize: 9, color: accentColor, letterSpacing: '0.12em',
              marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: accentColor,
                boxShadow: `0 0 8px ${accentColor}, 0 0 16px ${accentColor}60`,
              }} />
              СТАТУС
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.entries(stats)
                .filter(([k]) => k !== 'last_updated')
                .slice(0, 4)
                .map(([k, v]) => (
                <div key={k} style={{
                  background: 'var(--bg3)',
                  border: `1px solid ${accentColor}20`,
                  borderRadius: 6, padding: '8px'
                }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: accentColor,
                    textShadow: `0 0 10px ${accentColor}80`,
                  }}>
                    {typeof v === 'number' ? v.toLocaleString() : String(v)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>
                    {STAT_LABELS[k] || k}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8
      }}>
        {entries.slice(0, 5).map(e => (
          <div key={e.id} style={{
            background: 'var(--bg3)', borderRadius: 8, padding: '7px 10px',
            fontSize: 10, color: 'var(--text-dim)',
            borderLeft: `2px solid ${accentColor}40`
          }}>
            <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{e.entry_date}</span>
            {e.content}
          </div>
        ))}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              background: m.role === 'user' ? accentColor : 'var(--bg2)',
              color: m.role === 'user' ? '#000' : 'var(--text)',
              border: m.role === 'gremlin' ? `1px solid ${accentColor}30` : 'none',
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '8px 12px', fontSize: 12, lineHeight: 1.5
            }}>
              {m.isFile
                ? <span style={{ opacity: 0.9 }}>{m.text}</span>
                : m.text
              }
            </div>
          </div>
        ))}

        {(sending || fileLoading) && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--bg2)', border: `1px solid ${accentColor}30`,
              borderRadius: '12px 12px 12px 2px', padding: '8px 14px',
              fontSize: 12, color: 'var(--text-muted)'
            }}>
              {fileLoading ? 'читаю файл...' : '...'}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg2)',
        borderTop: `1px solid ${accentColor}30`,
        display: 'flex', gap: 8, alignItems: 'flex-end'
      }}>
        {/* File button */}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.json,.xlsx,.xls"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending || fileLoading}
          style={{
            background: 'var(--bg3)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
            color: accentColor, opacity: sending ? 0.5 : 1
          }}
        >
          📎
        </button>

        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Напиши ${gremlin.name}...`}
          style={{
            flex: 1, background: 'var(--bg3)',
            border: `1px solid ${accentColor}30`,
            borderRadius: 6, padding: '8px 10px',
            color: 'var(--text)', fontFamily: 'inherit',
            fontSize: 12, resize: 'none', outline: 'none'
          }}
        />
        <button
          onClick={() => send()}
          disabled={sending || !input.trim()}
          style={{
            background: input.trim() ? accentColor : 'var(--bg3)',
            color: input.trim() ? '#000' : 'var(--text-muted)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 11, fontWeight: 700,
            transition: 'all 0.15s', flexShrink: 0,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          ▸
        </button>
      </div>
    </div>
  )
}
