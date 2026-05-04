import { useState, useEffect } from 'react'
import { addTask, getTasks, updateTask, deleteTask } from '../services/api'

const PRIORITIES = [
  { id: 'high', label: '🔴 срочно', color: '#e24b4a' },
  { id: 'medium', label: '🟡 средне', color: '#d4a017' },
  { id: 'low', label: '🟢 не горит', color: '#3ecf70' },
]

function daysLeft(deadline) {
  if (!deadline) return null
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000)
  return diff
}

export default function SecretaryForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState('medium')
  const [notifyBefore, setNotifyBefore] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => { loadTasks() }, [gremlinId])

  const loadTasks = async () => {
    try {
      const data = await getTasks(gremlinId)
      setTasks(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSave = async () => {
    setError(null)
    if (!title.trim()) { setError('Укажи задачу'); return }
    setSaving(true)
    try {
      const result = await addTask(gremlinId, {
        title: title.trim(),
        description: description.trim() || null,
        deadline: deadline || null,
        priority,
        notify_before: parseInt(notifyBefore) || 1,
      })
      if (result?.task) setTasks(t => [result.task, ...t])
      if (result?.stats) onStatsUpdate(result.stats)
      setTitle(''); setDescription(''); setDeadline(''); setPriority('medium'); setNotifyBefore('1')
    } catch (e) { console.error(e); setError('Ошибка сохранения') }
    setSaving(false)
  }

  const handleDone = async (id) => {
    try {
      const result = await updateTask(id, { status: 'done' })
      setTasks(t => t.map(x => x.id === id ? { ...x, status: 'done' } : x))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTask(id, gremlinId)
      setTasks(t => t.filter(x => x.id !== id))
    } catch (e) { console.error(e) }
  }

  const pending = tasks.filter(t => t.status === 'pending')
  const done = tasks.filter(t => t.status === 'done')
  const shown = filter === 'pending' ? pending : done

  const priColor = { high: '#e24b4a', medium: '#d4a017', low: '#3ecf70' }

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Счётчик задач */}
      {pending.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'всего', val: pending.length, color: accentColor },
            { label: 'срочных', val: pending.filter(t => t.priority === 'high').length, color: '#e24b4a' },
            { label: 'просрочено', val: pending.filter(t => t.deadline && daysLeft(t.deadline) < 0).length, color: '#e24b4a' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'var(--bg2)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Задача */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ЗАДАЧА</div>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="что нужно сделать..."
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }}
        />
      </div>

      {/* Описание */}
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
        placeholder="детали, комментарий..."
        style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none', resize: 'none' }}
      />

      {/* Приоритет */}
      <div style={{ display: 'flex', gap: 5 }}>
        {PRIORITIES.map(p => (
          <button key={p.id} onClick={() => setPriority(p.id)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: priority === p.id ? p.color + '20' : 'var(--bg3)', border: '1px solid ' + (priority === p.id ? p.color + '60' : 'var(--border)'), color: priority === p.id ? p.color : 'var(--text-muted)' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Дедлайн + уведомление */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ДЕДЛАЙН</div>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>УВЕДОМ. ЗА</div>
          <select value={notifyBefore} onChange={e => setNotifyBefore(e.target.value)}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="0">в день</option>
            <option value="1">1 день</option>
            <option value="2">2 дня</option>
            <option value="3">3 дня</option>
            <option value="7">неделю</option>
          </select>
        </div>
      </div>

      {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving || !title.trim()}
        style={{ background: title.trim() ? accentColor : 'var(--bg3)', color: title.trim() ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
        {saving ? '...' : 'ДОБАВИТЬ ЗАДАЧУ'}
      </button>

      {/* Фильтр */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
        {[['pending', `в работе (${pending.length})`], ['done', `готово (${done.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            style={{ flex: 1, padding: '6px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: filter === id ? accentColor : 'transparent', color: filter === id ? '#000' : 'var(--text-muted)', border: 'none', fontWeight: filter === id ? 700 : 400 }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
        : shown.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Пусто</div>
        : shown.map(task => {
          const days = daysLeft(task.deadline)
          const overdue = days !== null && days < 0
          const urgent = days !== null && days <= 1 && days >= 0
          return (
            <div key={task.id} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px', borderLeft: '3px solid ' + (priColor[task.priority] || '#888') }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.title}</div>
                  {task.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{task.description}</div>}
                  {task.deadline && (
                    <div style={{ fontSize: 10, marginTop: 4, color: overdue ? '#e24b4a' : urgent ? '#d4a017' : 'var(--text-muted)' }}>
                      📅 {task.deadline} {overdue ? `(просрочено ${Math.abs(days)} д.)` : days === 0 ? '(сегодня!)' : days === 1 ? '(завтра)' : `(через ${days} д.)`}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {task.status === 'pending' && (
                    <button onClick={() => handleDone(task.id)}
                      style={{ background: '#3ecf7020', border: '1px solid #3ecf7040', color: '#3ecf70', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
                  )}
                  <button onClick={() => handleDelete(task.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
