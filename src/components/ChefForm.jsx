import { useState, useEffect } from 'react'
import { addMeal, getMeals, deleteMeal } from '../services/api'

const MEAL_TYPES = [
  { id: 'завтрак', label: '🌅 завтрак' },
  { id: 'обед', label: '☀️ обед' },
  { id: 'ужин', label: '🌙 ужин' },
  { id: 'перекус', label: '🍎 перекус' },
]

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function ChefForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState('обед')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMeals() }, [gremlinId])

  const loadMeals = async () => {
    try {
      const data = await getMeals(gremlinId)
      setMeals(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleSave = async () => {
    setError(null)
    if (!name.trim()) { setError('Укажи название блюда'); return }
    setSaving(true)
    try {
      const result = await addMeal(gremlinId, {
        name: name.trim(), meal_type: mealType,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        weight_g: weight ? parseInt(weight) : null,
        note: note.trim() || null, date,
      })
      if (result?.meal) setMeals(m => [result.meal, ...m])
      if (result?.stats) onStatsUpdate(result.stats)
      setName(''); setCalories(''); setProtein(''); setCarbs('')
      setFat(''); setWeight(''); setNote(''); setDate(todayStr())
    } catch (e) { console.error(e); setError('Ошибка сохранения') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteMeal(id, gremlinId)
      setMeals(m => m.filter(x => x.id !== id))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch (e) { console.error(e) }
  }

  const inp = (val, set, ph, label, mode = 'decimal') => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <input type="text" inputMode={mode} value={val} onChange={e => set(e.target.value)} placeholder={ph}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  // Дневные итоги
  const today = meals.filter(m => m.date === date)
  const todayKcal = today.reduce((s, m) => s + (m.calories || 0), 0)
  const todayProtein = today.reduce((s, m) => s + (m.protein || 0), 0)

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Дневной итог */}
      {todayKcal > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', background: accentColor + '10', borderRadius: 8, border: '1px solid ' + accentColor + '20' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{todayKcal}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>ккал сегодня</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{Math.round(todayProtein)}г</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>белок</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: accentColor }}>{today.length}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>приёмов</div>
          </div>
        </div>
      )}

      {/* Название блюда */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>БЛЮДО</div>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="овсянка, куриная грудка..."
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }}
        />
      </div>

      {/* Тип приёма */}
      <div style={{ display: 'flex', gap: 5 }}>
        {MEAL_TYPES.map(mt => (
          <button key={mt.id} onClick={() => setMealType(mt.id)}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: mealType === mt.id ? accentColor + '20' : 'var(--bg3)', border: '1px solid ' + (mealType === mt.id ? accentColor + '60' : 'var(--border)'), color: mealType === mt.id ? accentColor : 'var(--text-muted)' }}>
            {mt.label}
          </button>
        ))}
      </div>

      {/* КБЖУ */}
      <div style={{ display: 'flex', gap: 6 }}>
        {inp(calories, setCalories, '300', 'ККАЛ')}
        {inp(protein, setProtein, '25', 'БЕЛОК г')}
        {inp(carbs, setCarbs, '40', 'УГЛЕВ г')}
        {inp(fat, setFat, '10', 'ЖИР г')}
      </div>

      {/* Вес + заметка + дата */}
      <div style={{ display: 'flex', gap: 8 }}>
        {inp(weight, setWeight, '200', 'ГРАММЫ')}
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка..."
          style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}
        />
      </div>

      {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving || !name.trim()}
        style={{ background: name.trim() ? accentColor : 'var(--bg3)', color: name.trim() ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
        {saving ? '...' : 'ЗАПИСАТЬ'}
      </button>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>ИСТОРИЯ ПИТАНИЯ</div>

      {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
        : meals.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Пока нет записей</div>
        : meals.slice(0, 30).map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ fontSize: 16 }}>
              {m.meal_type === 'завтрак' ? '🌅' : m.meal_type === 'обед' ? '☀️' : m.meal_type === 'ужин' ? '🌙' : '🍎'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                {m.calories ? <span>🔥{m.calories}</span> : null}
                {m.protein ? <span>Б{Math.round(m.protein)}г</span> : null}
                {m.date && <span>{m.date}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
          </div>
        ))}
    </div>
  )
}
