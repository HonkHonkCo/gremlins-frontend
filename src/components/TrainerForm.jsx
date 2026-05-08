import { useState, useEffect } from 'react'
import { addWorkout, getWorkouts, deleteWorkout, getTrainingPlan, saveTrainingPlan } from '../services/api'

function todayStr() { return new Date().toISOString().split('T')[0] }
function todayDow() { return ['вс','пн','вт','ср','чт','пт','сб'][new Date().getDay()] }

const DAYS = ['пн','вт','ср','чт','пт','сб','вс']

const WORKOUT_ICONS = { бег: 19, отжимания: 20, подтягивания: 21, велосипед: 22, плавание: 23, йога: 24, силовая: 20, ходьба: 25 }

const WORKOUT_TYPES = [
  { id: 'бег',          label: 'бег',          fields: ['distance_km', 'duration_min', 'calories'] },
  { id: 'отжимания',    label: 'отжимания',    fields: ['sets', 'reps'] },
  { id: 'подтягивания', label: 'подтяг.',      fields: ['sets', 'reps'] },
  { id: 'велосипед',    label: 'вело',         fields: ['distance_km', 'duration_min'] },
  { id: 'плавание',     label: 'плавание',     fields: ['distance_km', 'duration_min'] },
  { id: 'йога',         label: 'йога',         fields: ['duration_min'] },
  { id: 'силовая',      label: 'силовая',      fields: ['sets', 'reps', 'weight_kg', 'duration_min'] },
  { id: 'ходьба',       label: 'ходьба',       fields: ['distance_km', 'duration_min'] },
  { id: 'другое',       label: '+ другое',     fields: ['duration_min', 'calories'] },
]

// Калории в минуту по типу тренировки (примерно)
const CAL_PER_MIN = {
  бег: 10, велосипед: 8, плавание: 9, йога: 3,
  силовая: 6, ходьба: 4, отжимания: 7, подтягивания: 7, другое: 5,
}

export default function TrainerForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [activeTab, setActiveTab] = useState('log')
  const [plan, setPlan] = useState({}) // { пн: 'бег', вт: '', ... }
  const [planLoading, setPlanLoading] = useState(true)
  const [planSaving, setPlanSaving] = useState(false)
  const [workoutType, setWorkoutType] = useState('бег')
  const [customType, setCustomType] = useState('')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadWorkouts(); loadPlan() }, [gremlinId])

  const loadPlan = async () => {
    try {
      const data = await getTrainingPlan(gremlinId).catch(() => null)
      if (data?.plan) setPlan(data.plan)
      else {
        // Fallback: localStorage
        try { const s = localStorage.getItem('plan_' + gremlinId); if (s) setPlan(JSON.parse(s)) } catch {}
      }
    } catch {}
    setPlanLoading(false)
  }

  const handleSavePlan = async (newPlan) => {
    setPlan(newPlan)
    try { localStorage.setItem('plan_' + gremlinId, JSON.stringify(newPlan)) } catch {}
    setPlanSaving(true)
    try { await saveTrainingPlan(gremlinId, newPlan).catch(() => {}) } catch {}
    setPlanSaving(false)
  }

  const markPlanDone = async (day) => {
    const today = todayStr()
    const doneKey = 'plan_done_' + gremlinId
    try {
      const done = JSON.parse(localStorage.getItem(doneKey) || '{}')
      done[today] = day
      localStorage.setItem(doneKey, JSON.stringify(done))
      // Автоматически записываем тренировку
      const type = plan[day]
      if (type && type !== 'отдых') {
        const result = await addWorkout(gremlinId, { type, date: today, note: 'по плану' })
        if (result?.workout) setWorkouts(w => [result.workout, ...w])
        if (result?.stats) onStatsUpdate(result.stats)
      }
    } catch {}
    loadWorkouts()
  }

  const loadWorkouts = async () => {
    try {
      const data = await getWorkouts(gremlinId)
      setWorkouts(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Авто-подсчёт калорий
  const autoCalories = () => {
    const dur = parseFloat(duration)
    if (!dur) return null
    const rate = CAL_PER_MIN[workoutType] || 5
    return Math.round(dur * rate)
  }

  const currentType = WORKOUT_TYPES.find(t => t.id === workoutType)
  const showFields = currentType?.fields || []

  const handleSave = async () => {
    setError(null)
    const finalType = workoutType === 'другое' ? (customType.trim() || 'другое') : workoutType
    if (!finalType) { setError('Укажи тип тренировки'); return }

    const cal = calories ? parseInt(calories) : autoCalories()
    setSaving(true)
    try {
      const result = await addWorkout(gremlinId, {
        type: finalType,
        duration_min: duration ? parseInt(duration) : null,
        distance_km: distance ? parseFloat(distance) : null,
        sets: sets ? parseInt(sets) : null,
        reps: reps ? parseInt(reps) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        calories: cal,
        note: note.trim() || null,
        date,
      })
      if (result?.workout) setWorkouts(w => [result.workout, ...w])
      if (result?.stats) onStatsUpdate(result.stats)
      setDuration(''); setDistance(''); setSets(''); setReps('')
      setWeight(''); setCalories(''); setNote(''); setDate(todayStr())
    } catch (e) {
      console.error(e); setError('Ошибка сохранения')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteWorkout(id, gremlinId)
      setWorkouts(w => w.filter(x => x.id !== id))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch (e) { console.error(e) }
  }

  const input = (val, set, placeholder, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <input type="text" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  const autoCal = !calories && autoCalories()

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Табы */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
        {[['log', 'Запись'], ['plan', 'План']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ flex: 1, padding: '7px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: activeTab === id ? accentColor : 'transparent', color: activeTab === id ? '#000' : 'var(--text-muted)', border: 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: ПЛАН */}
      {activeTab === 'plan' && (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ПЛАН НА НЕДЕЛЮ</div>
          {DAYS.map(day => {
            const isToday = day === todayDow()
            const doneKey = 'plan_done_' + gremlinId
            let isDone = false
            try { const done = JSON.parse(localStorage.getItem(doneKey) || '{}'); isDone = done[todayStr()] === day } catch {}
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, background: isToday ? accentColor + '15' : 'var(--bg2)', borderRadius: 8, padding: '8px 10px', border: isToday ? '1px solid ' + accentColor + '40' : '1px solid transparent' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? accentColor : 'var(--text-muted)', width: 20, flexShrink: 0 }}>{day}</div>
                <select
                  value={plan[day] || ''}
                  onChange={e => handleSavePlan({ ...plan, [day]: e.target.value })}
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}>
                  <option value="">— отдых —</option>
                  {WORKOUT_TYPES.filter(t => t.id !== 'другое').map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                {isToday && plan[day] && plan[day] !== 'отдых' && (
                  <button
                    onClick={() => markPlanDone(day)}
                    disabled={isDone}
                    style={{ background: isDone ? '#3ecf7020' : accentColor, color: isDone ? '#3ecf70' : '#000', border: isDone ? '1px solid #3ecf7040' : 'none', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, cursor: isDone ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    {isDone ? '✓ готово' : 'сделал'}
                  </button>
                )}
              </div>
            )
          })}
          {planSaving && <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>сохранение...</div>}
        </>
      )}

      {/* TAB: ЗАПИСЬ */}
      {activeTab === 'log' && (<>

      {/* Тип тренировки */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ВИД ТРЕНИРОВКИ</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {WORKOUT_TYPES.map(t => (
            <button key={t.id} onClick={() => setWorkoutType(t.id)}
              style={{ padding: '6px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: workoutType === t.id ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (workoutType === t.id ? accentColor + '70' : 'var(--border)'), color: workoutType === t.id ? accentColor : 'var(--text-muted)', fontWeight: workoutType === t.id ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
              {WORKOUT_ICONS[t.id] && <img src={`/Icons/${WORKOUT_ICONS[t.id]}.png`} style={{ width: 13, height: 13 }} />}
              {t.label}
            </button>
          ))}
        </div>
        {workoutType === 'другое' && (
          <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="название тренировки..."
            style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
          />
        )}
      </div>

      {/* Динамические поля */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showFields.includes('duration_min') && input(duration, setDuration, '30', 'МИН')}
        {showFields.includes('distance_km') && input(distance, setDistance, '5', 'КМ')}
        {showFields.includes('sets') && input(sets, setSets, '3', 'ПОДХОДЫ')}
        {showFields.includes('reps') && input(reps, setReps, '15', 'ПОВТОРЫ')}
        {showFields.includes('weight_kg') && input(weight, setWeight, '60', 'КГ')}
        {showFields.includes('calories') && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ККАЛ</div>
            <input type="text" inputMode="decimal" value={calories} onChange={e => setCalories(e.target.value)}
              placeholder={autoCal ? String(autoCal) : '0'}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
            />
            {autoCal && !calories && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>авто: ~{autoCal}</div>}
          </div>
        )}
      </div>

      {/* Заметка + дата */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка..."
          style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}
        />
      </div>

      {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving}
        style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        {saving ? '...' : 'ЗАПИСАТЬ'}
      </button>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>ПОСЛЕДНИЕ ТРЕНИРОВКИ</div>

      {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
        : workouts.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Пока нет записей</div>
        : workouts.slice(0, 30).map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
            <div style={{ flexShrink: 0 }}>
              <img src={`/Icons/${WORKOUT_ICONS[w.type] || 18}.png`} style={{ width: 18, height: 18 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>{w.type}
                {w.duration_min ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.duration_min} мин</span> : null}
                {w.distance_km ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.distance_km} км</span> : null}
                {w.sets && w.reps ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.sets}×{w.reps}</span> : null}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                {w.calories ? <span style={{ color: accentColor }}>{w.calories} ккал</span> : null}
                {w.date && <span>{w.date}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
          </div>
        ))}
      </>)}
    </div>
  )
}
