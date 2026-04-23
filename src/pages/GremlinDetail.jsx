import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat } from '../services/api'

export default function GremlinDetail({ gremlin, telegramId, onBack }) {
  const [entries, setEntries] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getEntries(gremlin.id)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [gremlin.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text }])
    setSending(true)
    try {
      const res = await sendChat(telegramId, gremlin.id, text)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <button className="topbar-back" onClick={onBack}>← назад</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em' }}>{gremlin.name}</div>
          <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 1 }}>{gremlin.role}</div>
        </div>
      </div>

      {/* Stats */}
      {gremlin.stats && Object.keys(gremlin.stats).length > 0 && (
        <div style={{ padding: '10px 12px 0' }}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 12px'
          }}>
            <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>▸ СТАТИСТИКА</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.entries(gremlin.stats).slice(0, 4).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '6px 8px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>{String(v)}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat history */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.slice(0, 5).map(e => (
          <div key={e.id} style={{
            background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px',
            fontSize: 10, color: 'var(--text-dim)', borderLeft: '2px solid var(--border)'
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
              background: m.role === 'user' ? 'var(--gold)' : 'var(--bg2)',
              color: m.role === 'user' ? '#000' : 'var(--text)',
              border: m.role === 'gremlin' ? '1px solid var(--border)' : 'none',
              borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              padding: '8px 12px',
              fontSize: 12,
              lineHeight: 1.5
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '12px 12px 12px 2px', padding: '8px 14px',
              fontSize: 12, color: 'var(--text-muted)'
            }}>...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8, alignItems: 'flex-end'
      }}>
        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Напиши гремлину..."
          style={{ flex: 1 }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            background: input.trim() ? 'var(--gold)' : 'var(--bg3)',
            color: input.trim() ? '#000' : 'var(--text-muted)',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.05em',
            transition: 'all 0.15s',
            flexShrink: 0
          }}
        >
          ▸
        </button>
      </div>
    </div>
  )
}
