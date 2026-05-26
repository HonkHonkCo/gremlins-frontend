import { useState, useEffect } from 'react'
import { addWorkout, getWorkouts, deleteWorkout } from '../services/api'

function todayStr() { return new Date().toISOString().split('T')[0] }
function todayDow(lang) { return lang === 'ru' ? ['вс','пн','вт','ср','чт','пт','сб'][new Date().getDay()] : ['su','mo','tu','we','th','fr','sa'][new Date().getDay()] }

const DAYS_RU = ['пн','вт','ср','чт','пт','сб','вс']
const DAYS_EN = ['mo','tu','we','th','fr','sa','su']

// Иконки: порядок соответствует реальным номерам файлов
const WORKOUT_ICONS = {
  бег: 19, отжимания: 21, подтягивания: 20, велосипед: 22,
  плавание: 23, йога: 24, силовая: 25, ходьба: 18,
}

const WORKOUT_TYPES = [
  { id: 'бег',          labelRu: 'бег',        labelEn: 'run',        fields: ['distance_km', 'duration_min', 'calories'] },
  { id: 'отжимания',    labelRu: 'отжимания',  labelEn: 'push-ups',   fields: ['sets', 'reps'] },
  { id: 'подтягивания', labelRu: 'подтяг.',    labelEn: 'pull-ups',   fields: ['sets', 'reps'] },
  { id: 'велосипед',    labelRu: 'вело',       labelEn: 'bike',       fields: ['distance_km', 'duration_min'] },
  { id: 'плавание',     labelRu: 'плавание',   labelEn: 'swim',       fields: ['distance_km', 'duration_min'] },
  { id: 'йога',         labelRu: 'йога',       labelEn: 'yoga',       fields: ['duration_min'] },
  { id: 'силовая',      labelRu: 'силовая',    labelEn: 'strength',   fields: ['sets', 'reps', 'weight_kg', 'duration_min'] },
  { id: 'ходьба',       labelRu: 'ходьба',     labelEn: 'walk',       fields: ['distance_km', 'duration_min'] },
  { id: 'другое',       labelRu: '+ другое',   labelEn: '+ other',    fields: ['duration_min', 'calories'] },
]

const CAL_PER_MIN = {
  бег: 10, велосипед: 8, плавание: 9, йога: 3,
  силовая: 6, ходьба: 4, отжимания: 7, подтягивания: 7, другое: 5,
}

// Попап выбора тренировок для плана
function PlanPickerPopup({ day, selected, onSave, onClose, accentColor, lang, customTypes }) {
  const [picked, setPicked] = useState(selected || [])
  const allTypes = [...WORKOUT_TYPES.filter(t => t.id !== 'другое'), ...customTypes.map(id => ({ id, labelRu: id, labelEn: id }))]
  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: '100%', background: 'var(--bg2)', borderRadius: '16px 16px 0 0', padding: '16px 12px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {lang === 'ru' ? 'Тренировки на' : 'Workouts for'} {day}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allTypes.map(t => {
            const checked = picked.includes(t.id)
            return (
              <button key={t.id} onClick={() => toggle(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: checked ? accentColor + '15' : 'var(--bg3)', border: '1px solid ' + (checked ? accentColor + '60' : 'var(--border)'), borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (checked ? accentColor : 'var(--border)'), background: checked ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <span style={{ color: '#000', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                {WORKOUT_ICONS[t.id] && <img src={`/Icons/${WORKOUT_ICONS[t.id]}.png`} style={{ width: 16, height: 16, flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: checked ? accentColor : 'var(--text)', fontWeight: checked ? 700 : 400 }}>
                  {lang === 'ru' ? t.labelRu : t.labelEn}
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button onClick={() => { onSave(picked); onClose() }}
            style={{ flex: 2, background: accentColor, color: '#000', border: 'none', borderRadius: 8, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'ru' ? 'Сохранить' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TrainerForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const DAYS = lang === 'ru' ? DAYS_RU : DAYS_EN
  const [activeTab, setActiveTab] = useState('log')
  const [plan, setPlan] = useState({})
  const [planLoading, setPlanLoading] = useState(true)
  const [planSaving, setPlanSaving] = useState(false)
  const [popupDay, setPopupDay] = useState(null)
  const [workoutType, setWorkoutType] = useState('бег')
  const [customType, setCustomType] = useState('')
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeInput, setNewTypeInput] = useState('')
  const [customTypes, setCustomTypes] = useState(() => { try { return JSON.parse(localStorage.getItem('custom_workout_types_' + gremlinId) || '[]') } catch { return [] } })
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

  const loadPlan = () => {
    try {
      const s = localStorage.getItem('plan_' + gremlinId)
      if (s) setPlan(JSON.parse(s))
    } catch {}
    setPlanLoading(false)
  }

  const handleSavePlan = (newPlan) => {
    setPlan(newPlan)
    try { localStorage.setItem('plan_' + gremlinId, JSON.stringify(newPlan)) } catch {}
  }

  const markPlanDone = async (day) => {
    const today = todayStr()
    const doneKey = 'plan_done_' + gremlinId
    try {
      const done = JSON.parse(localStorage.getItem(doneKey) || '{}')
      done[today] = day
      localStorage.setItem(doneKey, JSON.stringify(done))
      const types = Array.isArray(plan[day]) ? plan[day] : (plan[day] ? [plan[day]] : [])
      for (const type of types) {
        if (type && type !== 'отдых') {
          const result = await addWorkout(gremlinId, { type, date: today, note: lang === 'ru' ? 'по плану' : 'as planned' })
          if (result?.workout) setWorkouts(w => [result.workout, ...w])
          if (result?.stats) onStatsUpdate(result.stats)
        }
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

  const autoCalories = () => {
    const dur = parseFloat(duration)
    if (!dur) return null
    const rate = CAL_PER_MIN[workoutType] || 5
    return Math.round(dur * rate)
  }

  const currentType = WORKOUT_TYPES.find(t => t.id === workoutType)
  const showFields = currentType?.fields || ['duration_min', 'calories']

  const handleSave = async () => {
    setError(null)
    const finalType = workoutType === 'другое' ? (customType.trim() || 'другое') : workoutType
    if (!finalType) { setError(lang === 'ru' ? 'Укажи тип тренировки' : 'Select workout type'); return }
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
      console.error(e); setError(lang === 'ru' ? 'Ошибка сохранения' : 'Save error')
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

  const inp = (val, set, placeholder, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <input type="text" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
      />
    </div>
  )

  const autoCal = !calories && autoCalories()

  // Недельная статистика по каждому типу тренировки (как у повара)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekStr = weekAgo.toISOString().split('T')[0]
  const weekWorkouts = workouts.filter(w => w.date >= weekStr)

  // Группируем по типу тренировки
  const weekByType = {}
  weekWorkouts.forEach(w => {
    const t = w.type || 'другое'
    if (!weekByType[t]) weekByType[t] = { count: 0, duration: 0, distance: 0, calories: 0, sets: 0, reps: 0 }
    weekByType[t].count++
    weekByType[t].duration += w.duration_min || 0
    weekByType[t].distance += w.distance_km || 0
    weekByType[t].calories += w.calories || 0
    weekByType[t].sets += w.sets || 0
    weekByType[t].reps += w.reps || 0
  })

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Попап плана */}
      {popupDay && (
        <PlanPickerPopup
          day={popupDay}
          selected={Array.isArray(plan[popupDay]) ? plan[popupDay] : (plan[popupDay] ? [plan[popupDay]] : [])}
          onSave={(picked) => handleSavePlan({ ...plan, [popupDay]: picked })}
          onClose={() => setPopupDay(null)}
          accentColor={accentColor}
          lang={lang}
          customTypes={customTypes}
        />
      )}

      {/* Табы */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
        {[['log', lang === 'ru' ? 'Запись' : 'Log'], ['plan', lang === 'ru' ? 'План' : 'Plan']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ flex: 1, padding: '7px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: activeTab === id ? accentColor : 'transparent', color: activeTab === id ? '#000' : 'var(--text-muted)', border: 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB: ПЛАН */}
      {activeTab === 'plan' && (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{lang === 'ru' ? 'ПЛАН НА НЕДЕЛЮ' : 'WEEKLY PLAN'}</div>
          {DAYS.map(day => {
            const isToday = day === todayDow(lang)
            const doneKey = 'plan_done_' + gremlinId
            let isDone = false
            try { const done = JSON.parse(localStorage.getItem(doneKey) || '{}'); isDone = done[todayStr()] === day } catch {}
            const dayTypes = Array.isArray(plan[day]) ? plan[day] : (plan[day] ? [plan[day]] : [])
            return (
              <div key={day} style={{ background: isToday ? accentColor + '15' : 'var(--bg2)', borderRadius: 8, padding: '8px 10px', border: isToday ? '1px solid ' + accentColor + '40' : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? accentColor : 'var(--text-muted)', width: 20, flexShrink: 0 }}>{day}</div>
                  <button onClick={() => setPopupDay(day)}
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minHeight: 34 }}>
                    {dayTypes.length === 0
                      ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— {lang === 'ru' ? 'отдых' : 'rest'} —</span>
                      : <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {dayTypes.map(t => {
                            const wt = WORKOUT_TYPES.find(w => w.id === t) || { labelRu: t, labelEn: t }
                            return <span key={t} style={{ fontSize: 10, background: accentColor + '25', color: accentColor, border: '1px solid ' + accentColor + '50', borderRadius: 12, padding: '2px 8px', fontWeight: 700 }}>{lang === 'ru' ? wt.labelRu : wt.labelEn}</span>
                          })}
                        </div>
                    }
                  </button>
                  {isToday && dayTypes.length > 0 && (
                    <button onClick={() => markPlanDone(day)} disabled={isDone}
                      style={{ background: isDone ? '#3ecf7020' : accentColor, color: isDone ? '#3ecf70' : '#000', border: isDone ? '1px solid #3ecf7040' : 'none', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, cursor: isDone ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {isDone ? (lang === 'ru' ? '✓ готово' : '✓ done') : (lang === 'ru' ? 'сделал' : 'done')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* TAB: ЗАПИСЬ */}
      {activeTab === 'log' && (<>

        {/* Недельная статистика — карточки по типу тренировки как у повара */}
        {Object.keys(weekByType).length > 0 && (
          <div style={{ background: accentColor + '10', borderRadius: 8, border: '1px solid ' + accentColor + '20', overflow: 'hidden' }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', padding: '8px 10px 4px' }}>
              {lang === 'ru' ? 'ЗА НЕДЕЛЮ' : 'THIS WEEK'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {Object.entries(weekByType).map(([type, stats], i, arr) => {
                const icon = WORKOUT_ICONS[type]
                const parts = []
                if (stats.duration) parts.push(stats.duration + (lang === 'ru' ? ' мин' : ' min'))
                if (stats.distance) parts.push(stats.distance.toFixed(1) + ' km')
                if (stats.sets && stats.reps) parts.push(stats.sets + '×' + stats.reps)
                if (stats.calories) parts.push(stats.calories + ' ккал')
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderTop: i > 0 ? '1px solid ' + accentColor + '15' : 'none' }}>
                    {icon ? <img src={`/Icons/${icon}.png`} style={{ width: 16, height: 16, flexShrink: 0 }} /> : <div style={{ width: 16 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700 }}>{type} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>× {stats.count}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {parts.map((p, pi) => <span key={pi} style={p.includes('ккал') ? { color: accentColor } : {}}>{p}</span>)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Тип тренировки */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{lang === 'ru' ? 'ВИД ТРЕНИРОВКИ' : 'WORKOUT TYPE'}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[...WORKOUT_TYPES, ...customTypes.map(id => ({ id, labelRu: id, labelEn: id, fields: ['duration_min', 'calories'], custom: true }))].map(t => (
              <button key={t.id} onClick={() => { setWorkoutType(t.id); if (t.id !== 'другое') setShowNewType(false) }}
                style={{ padding: '6px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: workoutType === t.id ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (workoutType === t.id ? accentColor + '70' : 'var(--border)'), color: workoutType === t.id ? accentColor : 'var(--text-muted)', fontWeight: workoutType === t.id ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                {WORKOUT_ICONS[t.id] && <img src={`/Icons/${WORKOUT_ICONS[t.id]}.png`} style={{ width: 13, height: 13 }} />}
                {lang === 'ru' ? t.labelRu : t.labelEn}
              </button>
            ))}
          </div>

          {/* Другое — создать новый тип как у бухгалтера */}
          {workoutType === 'другое' && (
            <div style={{ marginTop: 6 }}>
              {showNewType ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newTypeInput} onChange={e => setNewTypeInput(e.target.value)}
                    placeholder={lang === 'ru' ? 'название тренировки...' : 'workout name...'}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTypeInput.trim()) {
                        const nc = newTypeInput.trim().toLowerCase()
                        const updated = [...customTypes.filter(c => c !== nc), nc]
                        setCustomTypes(updated)
                        try { localStorage.setItem('custom_workout_types_' + gremlinId, JSON.stringify(updated)) } catch {}
                        setWorkoutType(nc); setNewTypeInput(''); setShowNewType(false)
                      }
                    }}
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
                  <button onClick={() => {
                    if (!newTypeInput.trim()) return
                    const nc = newTypeInput.trim().toLowerCase()
                    const updated = [...customTypes.filter(c => c !== nc), nc]
                    setCustomTypes(updated)
                    try { localStorage.setItem('custom_workout_types_' + gremlinId, JSON.stringify(updated)) } catch {}
                    setWorkoutType(nc); setNewTypeInput(''); setShowNewType(false)
                  }} style={{ background: accentColor + '25', border: '1px solid ' + accentColor + '60', color: accentColor, borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    OK
                  </button>
                </div>
              ) : (
                <input value={customType} onChange={e => setCustomType(e.target.value)}
                  placeholder={lang === 'ru' ? 'или введи название...' : 'or enter name...'}
                  onFocus={() => setShowNewType(true)}
                  style={{ marginTop: 4, width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Динамические поля */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {showFields.includes('duration_min') && inp(duration, setDuration, '30', lang === 'ru' ? 'МИН' : 'MIN')}
          {showFields.includes('distance_km') && inp(distance, setDistance, '5', lang === 'ru' ? 'КМ' : 'KM')}
          {showFields.includes('sets') && inp(sets, setSets, '3', lang === 'ru' ? 'ПОДХОДЫ' : 'SETS')}
          {showFields.includes('reps') && inp(reps, setReps, '15', lang === 'ru' ? 'ПОВТОРЫ' : 'REPS')}
          {showFields.includes('weight_kg') && inp(weight, setWeight, '60', lang === 'ru' ? 'КГ' : 'KG')}
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
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'ru' ? 'Заметка...' : 'Note...'}
            style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
          />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}
          />
        </div>

        {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : lang === 'ru' ? 'ЗАПИСАТЬ' : 'LOG WORKOUT'}
        </button>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>{lang === 'ru' ? 'ПОСЛЕДНИЕ ТРЕНИРОВКИ' : 'RECENT WORKOUTS'}</div>

        {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
          : workouts.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>{lang === 'ru' ? 'Пока нет записей' : 'No workouts yet'}</div>
          : workouts.slice(0, 30).map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ flexShrink: 0 }}>
                <img src={`/Icons/${WORKOUT_ICONS[w.type] || 18}.png`} style={{ width: 18, height: 18 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text)' }}>{w.type}
                  {w.duration_min ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.duration_min} {lang === 'ru' ? 'мин' : 'min'}</span> : null}
                  {w.distance_km ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.distance_km} km</span> : null}
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
