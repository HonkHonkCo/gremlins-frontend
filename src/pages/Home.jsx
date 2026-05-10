import { useState, useEffect } from 'react'
import { getGremlins } from '../services/api'
import { t } from '../i18n'
import BgAnimation from '../components/BgAnimation'

const ROLE_COLOR_VARIANTS = {
  accountant: ['#3ecf70', '#00ddaa', '#aaff44', '#00ffcc'],
  trainer:    ['#4a9eff', '#aa44ff', '#00ccff', '#ff44aa'],
  secretary:  ['#d4a017', '#ff6600', '#ffdd00', '#dd4488'],
  chef:       ['#ff7043', '#ff2288', '#ffaa00', '#ff44cc'],
}

const ROLE_ICONS = {
  accountant: '🧮', trainer: '🏋️', secretary: '📋', chef: '🍽️',
}

function getAccentColor(role, gremlinId) {
  const variants = ROLE_COLOR_VARIANTS[role] || ['#d4a017']
  if (!gremlinId || variants.length === 1) return variants[0]
  const seg = gremlinId.replace(/-/g, '')
  const last8 = seg.slice(-8)
  const num = parseInt(last8, 16) || 0
  return variants[num % variants.length]
}

const STAT_LABELS = {
  expense_thb: 'расход ฿', expense_rub: 'расход ₽', expense_usd: 'расход $',
  income_thb: 'доход ฿', income_rub: 'доход ₽', income_usd: 'доход $',
  balance_thb: 'баланс ฿', balance_rub: 'баланс ₽', balance_usd: 'баланс $',
  total_balance_usd: 'баланс $', total_expense_usd: 'расход $', total_income_usd: 'доход $',
  last_calories: 'ккал', last_workout: 'тренировка', last_water: 'вода л',
  weight_kg: 'вес кг', steps: 'шаги', last_pushups: 'отжимания', last_distance_km: 'км',
  pending_tasks: 'задач', last_task: 'задача', next_deadline: 'дедлайн',
  last_meal: 'блюдо', last_protein: 'белок г',
}

// Ключи которые не нужно показывать на главном экране
const SKIP_KEYS = new Set([
  'categories', 'last_updated', 'total_meals', 'total_workouts',
  'last_task', 'last_meal', 'last_workout', 'last_water',
])

// Только важные ключи по роли для главного экрана
const HOME_STAT_KEYS = {
  accountant: ['balance_thb', 'balance_usd', 'balance_rub', 'expense_thb', 'expense_usd', 'expense_rub'],
  trainer: ['last_distance_km', 'last_duration_min', 'last_pushups', 'total_calories', 'weight_kg'],
  chef: ['today_calories', 'today_protein', 'today_carbs', 'last_calories', 'last_protein'],
  secretary: ['next_task_title', 'next_deadline', 'pending_tasks'],
}

function humanLabel(k) {
  if (STAT_LABELS[k]) return STAT_LABELS[k]
  if (k.startsWith('expense_')) return 'расход ' + k.split('_').slice(1).join('').toUpperCase()
  if (k.startsWith('income_')) return 'доход ' + k.split('_').slice(1).join('').toUpperCase()
  if (k.startsWith('balance_')) return 'баланс ' + k.split('_').slice(1).join('').toUpperCase()
  if (k.startsWith('investment_')) return 'инвест ' + k.split('_').slice(1).join('').toUpperCase()
  if (k.startsWith('last_')) return k.slice(5).replace(/_/g, ' ')
  return k.replace(/_/g, ' ')
}

function getHomeStats(g) {
  const stats = g.stats || {}
  const priority = HOME_STAT_KEYS[g.role] || []
  // Сначала по приоритету
  for (const k of priority) {
    if (stats[k] !== undefined && stats[k] !== null && stats[k] !== 0 && stats[k] !== '') {
      return [k, stats[k]]
    }
  }
  // Fallback — первый непустой не-мусорный ключ
  for (const [k, v] of Object.entries(stats)) {
    if (SKIP_KEYS.has(k)) continue
    if (typeof v === 'object') continue
    if (v === 0 || v === null || v === '' || v === undefined) continue
    return [k, v]
  }
  return null
}

const PRI_COLOR = { high: '#e24b4a', medium: '#d4a017', low: '#68b281' }

function formatDeadline(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (diff < 0) return { text: 'просрочено', color: '#e24b4a' }
  if (diff === 0) return { text: 'сегодня!', color: '#e24b4a' }
  if (diff === 1) return { text: 'завтра', color: '#d4a017' }
  return { text: `${diff}д.`, color: 'var(--text-muted)' }
}

function GremlinStatusLine({ g, color, statLabel }) {
  const stats = g.stats || {}

  if (g.role === 'secretary') {
    // Берём топ-3 задачи из stats (бэкенд должен класть их в next_tasks)
    const tasks = stats.next_tasks || []
    // Fallback если нет next_tasks — показываем старый формат
    if (!tasks.length) {
      const pending = stats.pending_tasks || 0
      const title = stats.next_task_title || stats.last_task
      const deadline = stats.next_deadline
      const dl = formatDeadline(deadline)
      if (!pending && !title) return null
      return (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
          {pending > 0 && <span style={{ color, flexShrink: 0 }}>{pending} задач</span>}
          {title && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{title}</span>}
          {dl && <span style={{ color: dl.color, flexShrink: 0, fontWeight: 700 }}>{dl.text}</span>}
        </div>
      )
    }
    // 3 ячейки с задачами
    return (
      <div style={{ display: 'flex', gap: 4, marginTop: 4, minWidth: 0 }}>
        {tasks.slice(0, 3).map((task, i) => {
          const dl = formatDeadline(task.deadline)
          const priColor = PRI_COLOR[task.priority] || color
          return (
            <div key={i} style={{ flex: 1, minWidth: 0, background: priColor + '15', border: '1px solid ' + priColor + '40', borderRadius: 6, padding: '4px 5px' }}>
              <div style={{ fontSize: 9, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {task.title}
              </div>
              {dl && (
                <div style={{ fontSize: 8, color: dl.color, marginTop: 1, fontWeight: 700 }}>{dl.text}</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (g.role === 'chef') {
    // today_calories пишется бэкендом в stats при добавлении приёма пищи
    const kcal = stats.today_calories
    const weekKcal = stats.week_calories
    const protein = stats.today_protein
    const carbs = stats.today_carbs
    // Fallback на last_calories если сегодня ещё нет данных
    const displayKcal = kcal || stats.last_calories
    if (!displayKcal) return null
    return (
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <span style={{ color, fontWeight: 700 }}>{displayKcal} ккал{kcal ? ' сег.' : ''}</span>
        {protein > 0 && <span>Б{Math.round(protein)}г</span>}
        {carbs > 0 && <span>У{Math.round(carbs)}г</span>}
        {weekKcal > 0 && <span style={{ color: 'var(--text-muted)' }}>·7д:{Math.round(weekKcal/7)}/д</span>}
      </div>
    )
  }

  if (g.role === 'trainer') {
    const type = stats.last_workout_type
    const dist = stats.last_distance_km
    const dur = stats.last_duration_min
    const todayPlan = stats.today_plan
    const planDone = stats.today_plan_done
    if (todayPlan && !planDone) {
      return (
        <div style={{ fontSize: 9, color: '#e24b4a', marginTop: 2, fontWeight: 700 }}>
          сегодня: {todayPlan}
        </div>
      )
    }
    if (!type && !dist) return null
    return (
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 5, alignItems: 'center' }}>
        {type && <img src={`/Icons/${
          type === 'бег' ? 19 : type === 'отжимания' ? 20 : type === 'подтягивания' ? 21 :
          type === 'велосипед' ? 22 : type === 'плавание' ? 23 : type === 'йога' ? 24 : 25
        }.png`} style={{ width: 11, height: 11 }} />}
        {dist && <span style={{ color }}>{dist} км</span>}
        {dur && <span>{dur} мин</span>}
      </div>
    )
  }

  // Бухгалтер
  const firstStat = getHomeStats(g)
  if (!firstStat) return null
  return (
    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
      {statLabel(firstStat[0])}: <span style={{ color, textShadow: `0 0 6px ${color}60` }}>{String(firstStat[1])}</span>
    </div>
  )
}

export default function Home({ userId, lang, onSelect, onAdd, onReport }) {
  const [gremlins, setGremlins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    getGremlins(userId)
      .then(data => setGremlins(Array.isArray(data) ? data : []))
      .catch(() => setGremlins([]))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">{t(lang, 'loading')}</div>

  const allStats = gremlins.flatMap(g => {
    const color = getAccentColor(g.role, g.id)
    const stats = g.stats || {}
    const priority = HOME_STAT_KEYS[g.role] || []
    // Берём до 2 важных стата по приоритету
    const result = []
    for (const k of priority) {
      if (stats[k] !== undefined && stats[k] !== null && stats[k] !== 0 && stats[k] !== '' && typeof stats[k] !== 'object') {
        result.push({ key: k, value: stats[k], color, gremlin: g.name })
        if (result.length >= 2) break
      }
    }
    return result
  }).slice(0, 6)

  const statLabel = (k) => humanLabel(k)

  return (
    <div style={{ padding: '0 12px 12px', position: 'relative' }}>
      <BgAnimation />
      <div style={{ position: 'relative', zIndex: 1 }}>
      {allStats.length > 0 && (
        <div style={{ margin: '12px 0 8px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 6 }}>
            {t(lang, 'globalStatus')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {allStats.map((s, i) => (
              <div key={i} style={{ background: 'rgba(26, 25, 22, 0.6)', backdropFilter: 'blur(8px)', border: `1px solid ${s.color}30`, borderRadius: 8, padding: '8px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.color, textShadow: `0 0 10px ${s.color}80` }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : String(s.value).slice(0, 8)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{statLabel(s.key)}</div>
                <div style={{ fontSize: 10, color: s.color, opacity: 0.7, marginTop: 1 }}>{s.gremlin.slice(0, 10)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ margin: '0 0 8px', borderColor: '#9a7310', cursor: 'pointer', background: 'rgba(26, 25, 22, 0.6)', backdropFilter: 'blur(8px)' }} onClick={onReport}>
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 4 }}>
          {t(lang, 'weeklyBanner')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
          {t(lang, 'weeklyBannerSub')}
        </div>
      </div>

      <div className="section-label">{t(lang, 'myGremlins')}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gremlins.map(g => {
          const color = getAccentColor(g.role, g.id)
          return (
            <div key={g.id} className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderColor: `${color}30`, background: 'rgba(26, 25, 22, 0.6)', backdropFilter: 'blur(8px)' }}
              onClick={() => onSelect(g)}>
              <div style={{ width: 44, height: 44, borderRadius: 10, border: `2px solid ${color}60`, boxShadow: `0 0 8px ${color}30`, flexShrink: 0, overflow: 'hidden', background: 'var(--bg3)' }}>
                <img src={`/gremlins/${g.role}.png`} alt={g.role} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{g.name}</div>
                <div style={{ fontSize: 10, color, marginTop: 2 }}>{t(lang, g.role) || g.role}</div>
                <GremlinStatusLine g={g} color={color} statLabel={statLabel} />
              </div>
              <div style={{ fontSize: 16, color: 'var(--text-muted)' }}>›</div>
            </div>
          )
        })}

        <button onClick={onAdd} style={{ background: 'rgba(26, 25, 22, 0.6)', backdropFilter: 'blur(8px)', border: '1px dashed var(--border)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-dim)', fontSize: 11, width: '100%', fontFamily: 'inherit', cursor: 'pointer' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'var(--text-muted)', flexShrink: 0 }}>+</div>
          <span>{t(lang, 'addGremlin')}</span>
        </button>
      </div>
      </div>
    </div>
  )
}
