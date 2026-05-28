import { useState, useEffect, useRef } from 'react'
import { addWorkout, getWorkouts, deleteWorkout, calcWorkoutCalories } from '../services/api'

function todayStr() { return new Date().toISOString().split('T')[0] }
function todayDow(lang) { return lang === 'ru' ? ['вс','пн','вт','ср','чт','пт','сб'][new Date().getDay()] : ['su','mo','tu','we','th','fr','sa'][new Date().getDay()] }

const DAYS_RU = ['пн','вт','ср','чт','пт','сб','вс']
const DAYS_EN = ['mo','tu','we','th','fr','sa','su']

const WORKOUT_ICONS = {
  бег: 20, силовая: 21, отжимания: 21, подтягивания: 22, турник: 22,
  велосипед: 23, плавание: 24, йога: 25, ходьба: 26,
}

const WORKOUT_TYPES = [
  { id: 'бег',          labelRu: 'бег',        labelEn: 'run',      fields: ['distance_km','duration_min','calories'] },
  { id: 'силовая',      labelRu: 'силовая',    labelEn: 'strength', fields: ['sets','reps','weight_kg','duration_min','calories'] },
  { id: 'отжимания',    labelRu: 'отжимания',  labelEn: 'push-ups', fields: ['sets','reps','calories'] },
  { id: 'подтягивания', labelRu: 'подтяг.',    labelEn: 'pull-ups', fields: ['sets','reps','calories'] },
  { id: 'велосипед',    labelRu: 'вело',       labelEn: 'bike',     fields: ['distance_km','duration_min','calories'] },
  { id: 'плавание',     labelRu: 'плавание',   labelEn: 'swim',     fields: ['distance_km','duration_min','calories'] },
  { id: 'йога',         labelRu: 'йога',       labelEn: 'yoga',     fields: ['duration_min','calories'] },
  { id: 'ходьба',       labelRu: 'ходьба',     labelEn: 'walk',     fields: ['distance_km','duration_min','calories'] },
  { id: 'другое',       labelRu: '+ другое',   labelEn: '+ other',  fields: ['duration_min','calories'] },
]

const PERIOD_OPTIONS_RU = ['день','нед','мес','3 мес','год']
const PERIOD_OPTIONS_EN = ['day','wk','mo','3 mo','yr']

function getPeriodRange(period) {
  const now = new Date()
  const today = todayStr()
  if (period === 0) return { from: today, to: today }
  const d = new Date()
  if (period === 1) d.setDate(d.getDate() - 6)
  else if (period === 2) d.setMonth(d.getMonth() - 1)
  else if (period === 3) d.setMonth(d.getMonth() - 3)
  else if (period === 4) d.setFullYear(d.getFullYear() - 1)
  return { from: d.toISOString().split('T')[0], to: today }
}

// Попап выбора тренировок для плана
function PlanPickerPopup({ day, selected, onSave, onClose, accentColor, lang, customTypes }) {
  const [picked, setPicked] = useState(selected || [])
  const allTypes = [
    ...WORKOUT_TYPES.filter(t => t.id !== 'другое'),
    ...customTypes.map(c => ({ id: c.id, labelRu: c.label, labelEn: c.label }))
  ]
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
            const icon = WORKOUT_ICONS[t.id]
            return (
              <button key={t.id} onClick={() => toggle(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: checked ? accentColor + '15' : 'var(--bg3)', border: '1px solid ' + (checked ? accentColor + '60' : 'var(--border)'), borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (checked ? accentColor : 'var(--border)'), background: checked ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <span style={{ color: '#000', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                {icon && <img src={`/Icons/${icon}.png`} style={{ width: 16, height: 16, flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: checked ? accentColor : 'var(--text)', fontWeight: checked ? 700 : 400 }}>
                  {lang === 'ru' ? t.labelRu : t.labelEn}
                </span>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'ru' ? 'Отмена' : 'Cancel'}
          </button>
          <button onClick={() => { onSave(picked); onClose() }} style={{ flex: 2, background: accentColor, color: '#000', border: 'none', borderRadius: 8, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'ru' ? 'Сохранить' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Попап выбора иконки для нового типа
function IconPickerPopup({ onSelect, onClose, accentColor, lang }) {
  const icons = [20,21,22,23,24,25,26]
  const labels = ['бег','силовая','турник','велосипед','плавание','йога','ходьба']
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: 16, width: 280 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 12, letterSpacing: '0.06em' }}>
          {lang === 'ru' ? 'ВЫБЕРИ ИКОНКУ' : 'PICK ICON'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {icons.map((n, i) => (
            <button key={n} onClick={() => onSelect(n)} title={labels[i]}
              style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              <img src={`/Icons/${n}.png`} style={{ width: 24, height: 24 }} />
              <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>{labels[i]}</span>
            </button>
          ))}
          <button onClick={() => onSelect(null)} title="без иконки"
            style={{ width: 52, height: 52, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 20 }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TrainerForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const DAYS = lang === 'ru' ? DAYS_RU : DAYS_EN
  const PERIOD_OPTIONS = lang === 'ru' ? PERIOD_OPTIONS_RU : PERIOD_OPTIONS_EN

  const [activeTab, setActiveTab] = useState('log')
  const [plan, setPlan] = useState({})
  const [popupDay, setPopupDay] = useState(null)

  // Кастомные типы: [{id, label, icon}]
  const [customTypes, setCustomTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('custom_workout_types2_' + gremlinId) || '[]') } catch { return [] }
  })
  const [showNewType, setShowNewType] = useState(false)
  const [newTypeLabel, setNewTypeLabel] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [pendingIcon, setPendingIcon] = useState(null)

  const [workoutType, setWorkoutType] = useState('бег')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [calcingCal, setCalcingCal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  // Итого таб
  const [statsPeriod, setStatsPeriod] = useState(1) // индекс

  useEffect(() => { loadWorkouts(); loadPlan() }, [gremlinId])

  const loadPlan = () => {
    try { const s = localStorage.getItem('plan_' + gremlinId); if (s) setPlan(JSON.parse(s)) } catch {}
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
      done[today] = day; localStorage.setItem(doneKey, JSON.stringify(done))
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
    try { const data = await getWorkouts(gremlinId); setWorkouts(Array.isArray(data) ? data : []) } catch {}
    setLoading(false)
  }

  const saveCustomTypes = (types) => {
    setCustomTypes(types)
    try { localStorage.setItem('custom_workout_types2_' + gremlinId, JSON.stringify(types)) } catch {}
  }

  const handleCalcCalories = async () => {
    setCalcingCal(true)
    try {
      const res = await calcWorkoutCalories({
        type: workoutType,
        duration_min: duration ? parseInt(duration) : null,
        distance_km: distance ? parseFloat(distance) : null,
        sets: sets ? parseInt(sets) : null,
        reps: reps ? parseInt(reps) : null,
        weight_kg: weight ? parseFloat(weight) : null,
      })
      if (res?.calories) setCalories(String(res.calories))
    } catch {}
    setCalcingCal(false)
  }

  const currentType = WORKOUT_TYPES.find(t => t.id === workoutType)
  const showFields = currentType?.fields || ['duration_min','calories']

  const handleSave = async () => {
    setError(null)
    const finalType = workoutType === 'другое' ? 'другое' : workoutType
    if (!finalType) { setError(lang === 'ru' ? 'Выбери тип' : 'Select type'); return }
    setSaving(true)
    try {
      const result = await addWorkout(gremlinId, {
        type: finalType, duration_min: duration ? parseInt(duration) : null,
        distance_km: distance ? parseFloat(distance) : null,
        sets: sets ? parseInt(sets) : null, reps: reps ? parseInt(reps) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        calories: calories ? parseInt(calories) : null,
        note: note.trim() || null, date,
      })
      if (result?.workout) setWorkouts(w => [result.workout, ...w])
      if (result?.stats) onStatsUpdate(result.stats)
      setDuration(''); setDistance(''); setSets(''); setReps('')
      setWeight(''); setCalories(''); setNote(''); setDate(todayStr())
    } catch { setError(lang === 'ru' ? 'Ошибка' : 'Error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteWorkout(id, gremlinId)
      setWorkouts(w => w.filter(x => x.id !== id))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch {}
  }

  const inp = (val, set, placeholder, label, flex = 1) => (
    <div style={{ flex }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <input type="text" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
    </div>
  )

  // Недельный статус (суммарно)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6)
  const weekStr = weekAgo.toISOString().split('T')[0]
  const weekWorkouts = workouts.filter(w => w.date >= weekStr)
  const weekTotalMin = weekWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0)
  const weekTotalCal = weekWorkouts.reduce((s, w) => s + (w.calories || 0), 0)
  const weekCount = weekWorkouts.length

  // Итого: фильтр по периоду
  const { from, to } = getPeriodRange(statsPeriod)
  const periodWorkouts = workouts.filter(w => w.date >= from && w.date <= to)
  const byType = {}
  periodWorkouts.forEach(w => {
    const t = w.type || 'другое'
    if (!byType[t]) byType[t] = { count: 0, duration: 0, distance: 0, calories: 0, sets: 0, reps: 0 }
    byType[t].count++
    byType[t].duration += w.duration_min || 0
    byType[t].distance += w.distance_km || 0
    byType[t].calories += w.calories || 0
    byType[t].sets += w.sets || 0
    byType[t].reps += w.reps || 0
  })

  // Хронология по дням
  const byDay = {}
  periodWorkouts.forEach(w => {
    if (!byDay[w.date]) byDay[w.date] = []
    byDay[w.date].push(w)
  })
  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a))

  const allWorkoutTypes = [
    ...WORKOUT_TYPES.filter(t => t.id !== 'другое'),
    ...customTypes.map(c => ({ id: c.id, labelRu: c.label, labelEn: c.label }))
  ]

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {popupDay && (
        <PlanPickerPopup
          day={popupDay}
          selected={Array.isArray(plan[popupDay]) ? plan[popupDay] : (plan[popupDay] ? [plan[popupDay]] : [])}
          onSave={(picked) => handleSavePlan({ ...plan, [popupDay]: picked })}
          onClose={() => setPopupDay(null)}
          accentColor={accentColor} lang={lang} customTypes={customTypes}
        />
      )}
      {showIconPicker && (
        <IconPickerPopup
          onSelect={(icon) => { setPendingIcon(icon); setShowIconPicker(false) }}
          onClose={() => setShowIconPicker(false)}
          accentColor={accentColor} lang={lang}
        />
      )}

      {/* Табы */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', borderRadius: 8, padding: 3 }}>
        {[['log', lang === 'ru' ? 'Запись' : 'Log'], ['stats', lang === 'ru' ? 'Итого' : 'Total'], ['plan', lang === 'ru' ? 'План' : 'Plan']].map(([id, label]) => (
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
            let isDone = false
            try { const done = JSON.parse(localStorage.getItem('plan_done_' + gremlinId) || '{}'); isDone = done[todayStr()] === day } catch {}
            const dayTypes = Array.isArray(plan[day]) ? plan[day] : (plan[day] ? [plan[day]] : [])
            return (
              <div key={day} style={{ background: isToday ? accentColor + '15' : 'var(--bg2)', borderRadius: 8, padding: '8px 10px', border: isToday ? '1px solid ' + accentColor + '40' : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isToday ? accentColor : 'var(--text-muted)', width: 20, flexShrink: 0 }}>{day}</div>
                  <button onClick={() => setPopupDay(day)}
                    style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minHeight: 34 }}>
                    {dayTypes.length === 0
                      ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— {lang === 'ru' ? 'отдых' : 'rest'} —</span>
                      : <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {dayTypes.map(t => {
                            const wt = allWorkoutTypes.find(w => w.id === t) || { labelRu: t, labelEn: t }
                            const icon = WORKOUT_ICONS[t] || customTypes.find(c => c.id === t)?.icon
                            return (
                              <span key={t} style={{ fontSize: 10, background: accentColor + '25', color: accentColor, border: '1px solid ' + accentColor + '50', borderRadius: 12, padding: '2px 8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                                {icon && <img src={`/Icons/${icon}.png`} style={{ width: 11, height: 11 }} />}
                                {lang === 'ru' ? wt.labelRu : wt.labelEn}
                              </span>
                            )
                          })}
                        </div>
                    }
                  </button>
                  {isToday && dayTypes.length > 0 && (
                    <button onClick={() => markPlanDone(day)} disabled={isDone}
                      style={{ background: isDone ? '#3ecf7020' : accentColor, color: isDone ? '#3ecf70' : '#000', border: isDone ? '1px solid #3ecf7040' : 'none', borderRadius: 6, padding: '5px 10px', fontSize: 10, fontWeight: 700, cursor: isDone ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {isDone ? '✓' : lang === 'ru' ? 'готово' : 'done'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* TAB: ИТОГО */}
      {activeTab === 'stats' && (
        <>
          {/* Переключатель периода */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PERIOD_OPTIONS.map((label, i) => (
              <button key={i} onClick={() => setStatsPeriod(i)}
                style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: statsPeriod === i ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (statsPeriod === i ? accentColor + '60' : 'var(--border)'), color: statsPeriod === i ? accentColor : 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Суммарная строка */}
          {periodWorkouts.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { val: periodWorkouts.length, label: lang === 'ru' ? 'тренировок' : 'workouts' },
                { val: Object.values(byType).reduce((s,t)=>s+t.duration,0) + (lang === 'ru' ? ' мин' : ' min'), label: lang === 'ru' ? 'время' : 'time' },
                { val: Object.values(byType).reduce((s,t)=>s+t.calories,0) + ' ккал', label: lang === 'ru' ? 'сожжено' : 'burned' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: accentColor + '10', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Таблица по типам */}
          {Object.keys(byType).length > 0 && (
            <div style={{ background: 'var(--bg2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', padding: '8px 12px 4px' }}>
                {lang === 'ru' ? 'ПО ВИДАМ' : 'BY TYPE'}
              </div>
              {Object.entries(byType).sort((a,b) => b[1].count - a[1].count).map(([type, s], i, arr) => {
                const icon = WORKOUT_ICONS[type] || customTypes.find(c => c.id === type)?.icon
                const parts = []
                if (s.duration) parts.push(s.duration + (lang === 'ru' ? ' мин' : ' min'))
                if (s.distance) parts.push(s.distance.toFixed(1) + ' km')
                if (s.sets && s.reps) parts.push(s.sets + '×' + s.reps)
                if (s.calories) parts.push(s.calories + ' ккал')
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    {icon ? <img src={`/Icons/${icon}.png`} style={{ width: 18, height: 18, flexShrink: 0 }} /> : <div style={{ width: 18 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700 }}>{type} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>× {s.count}</span></div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {parts.map((p, pi) => <span key={pi} style={p.includes('ккал') ? { color: accentColor } : {}}>{p}</span>)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {periodWorkouts.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              {lang === 'ru' ? 'Нет тренировок за этот период' : 'No workouts for this period'}
            </div>
          )}

          {/* Хронология по дням */}
          {sortedDays.length > 0 && (
            <>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 4 }}>{lang === 'ru' ? 'ХРОНОЛОГИЯ' : 'TIMELINE'}</div>
              {sortedDays.map(day => (
                <div key={day} style={{ background: 'var(--bg2)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, padding: '6px 12px', background: accentColor + '10', borderBottom: '1px solid var(--border)' }}>{day}</div>
                  {byDay[day].map((w, i) => {
                    const icon = WORKOUT_ICONS[w.type] || customTypes.find(c => c.id === w.type)?.icon
                    return (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        {icon ? <img src={`/Icons/${icon}.png`} style={{ width: 16, height: 16, flexShrink: 0 }} /> : <div style={{ width: 16 }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'var(--text)' }}>{w.type}
                            {w.duration_min ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.duration_min} {lang === 'ru' ? 'мин' : 'min'}</span> : null}
                            {w.distance_km ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.distance_km} km</span> : null}
                            {w.sets && w.reps ? <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{w.sets}×{w.reps}</span> : null}
                          </div>
                          {w.calories ? <div style={{ fontSize: 10, color: accentColor }}>{w.calories} ккал</div> : null}
                        </div>
                        <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* TAB: ЗАПИСЬ */}
      {activeTab === 'log' && (<>

        {/* Суммарный статус за неделю */}
        {weekCount > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { val: weekCount, label: lang === 'ru' ? 'тренировок' : 'workouts' },
              { val: weekTotalMin + (lang === 'ru' ? ' мин' : ' min'), label: lang === 'ru' ? 'время' : 'time' },
              { val: weekTotalCal + ' ккал', label: lang === 'ru' ? 'сожжено' : 'burned' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: accentColor + '10', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Тип тренировки */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lang === 'ru' ? 'ВИД ТРЕНИРОВКИ' : 'WORKOUT TYPE'}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[...WORKOUT_TYPES, ...customTypes.map(c => ({ id: c.id, labelRu: c.label, labelEn: c.label, fields: ['duration_min','calories'] }))].map(t => (
              <button key={t.id} onClick={() => setWorkoutType(t.id)}
                style={{ padding: '6px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: workoutType === t.id ? accentColor + '25' : 'var(--bg3)', border: '1px solid ' + (workoutType === t.id ? accentColor + '70' : 'var(--border)'), color: workoutType === t.id ? accentColor : 'var(--text-muted)', fontWeight: workoutType === t.id ? 700 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
                {(WORKOUT_ICONS[t.id] || customTypes.find(c=>c.id===t.id)?.icon) &&
                  <img src={`/Icons/${WORKOUT_ICONS[t.id] || customTypes.find(c=>c.id===t.id)?.icon}.png`} style={{ width: 13, height: 13 }} />}
                {lang === 'ru' ? t.labelRu : t.labelEn}
              </button>
            ))}
          </div>

          {/* Создать новый тип */}
          {workoutType === 'другое' && (
            <div style={{ marginTop: 8, background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px', border: '1px solid ' + accentColor + '30' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{lang === 'ru' ? 'НОВЫЙ ВИД' : 'NEW TYPE'}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => setShowIconPicker(true)}
                  style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {pendingIcon ? <img src={`/Icons/${pendingIcon}.png`} style={{ width: 24, height: 24 }} /> : <span style={{ fontSize: 18 }}>🏷</span>}
                </button>
                <input value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)}
                  placeholder={lang === 'ru' ? 'название...' : 'name...'}
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
                />
                <button onClick={() => {
                  if (!newTypeLabel.trim()) return
                  const id = newTypeLabel.trim().toLowerCase().replace(/\s+/g, '_')
                  const updated = [...customTypes.filter(c => c.id !== id), { id, label: newTypeLabel.trim(), icon: pendingIcon }]
                  saveCustomTypes(updated)
                  setWorkoutType(id); setNewTypeLabel(''); setPendingIcon(null)
                }} style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  OK
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Поля */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {showFields.includes('duration_min') && inp(duration, setDuration, '30', lang === 'ru' ? 'МИН' : 'MIN')}
          {showFields.includes('distance_km') && inp(distance, setDistance, '5', 'КМ')}
          {showFields.includes('sets') && inp(sets, setSets, '3', lang === 'ru' ? 'ПОДХ.' : 'SETS')}
          {showFields.includes('reps') && inp(reps, setReps, '15', lang === 'ru' ? 'ПОВТ.' : 'REPS')}
          {showFields.includes('weight_kg') && inp(weight, setWeight, '60', 'КГ')}
          {showFields.includes('calories') && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ККАЛ</div>
              <div style={{ display: 'flex', gap: 5 }}>
                <input type="text" inputMode="decimal" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0"
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none', minWidth: 0 }} />
                <button onClick={handleCalcCalories} disabled={calcingCal}
                  style={{ background: accentColor + '20', border: '1px solid ' + accentColor + '40', color: accentColor, borderRadius: 8, padding: '0 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {calcingCal ? '...' : (lang === 'ru' ? 'ИИ' : 'AI')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Заметка + дата */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'ru' ? 'Заметка...' : 'Note...'}
            style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
        </div>

        {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

        <button onClick={handleSave} disabled={saving}
          style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : lang === 'ru' ? 'ЗАПИСАТЬ' : 'LOG WORKOUT'}
        </button>

        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{lang === 'ru' ? 'ПОСЛЕДНИЕ ТРЕНИРОВКИ' : 'RECENT WORKOUTS'}</div>

        {loading ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
          : workouts.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>{lang === 'ru' ? 'Пока нет записей' : 'No workouts yet'}</div>
          : workouts.slice(0, 30).map(w => {
            const icon = WORKOUT_ICONS[w.type] || customTypes.find(c => c.id === w.type)?.icon
            return (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
                {icon ? <img src={`/Icons/${icon}.png`} style={{ width: 18, height: 18, flexShrink: 0 }} /> : <div style={{ width: 18, height: 18 }} />}
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
            )
          })}
      </>)}
    </div>
  )
}
