import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat, updateGremlin, deleteGremlin, getGremlin, getSnapshots, getTransactions } from '../services/api'
import { t } from '../i18n'
import Upgrade from './Upgrade'
import GremlinAnimation from '../components/GremlinAnimation'
import { getTheme, isFairyTheme } from '../themes.js'
import AccountantForm from '../components/AccountantForm'
import TrainerForm from '../components/TrainerForm'
import ChefForm from '../components/ChefForm'
import SecretaryForm from '../components/SecretaryForm'

function MiniChart({ data, color, height = 48 }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.balance)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const uid = 'gc_' + color.replace('#', '') + '_' + Math.random().toString(36).slice(2, 6)
  const W = 300
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    (height - 4) - ((v - min) / range) * (height - 12)
  ])
  const pathD = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const areaD = pathD + ` L${W},${height} L0,${height} Z`
  const isPositive = vals[vals.length - 1] >= vals[0]
  const lineColor = isPositive ? color : '#e24b4a'
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} style={{ display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${uid})`} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray"
          from={`0 ${W * 2}`} to={`${W * 2} 0`}
          dur="0.8s" fill="freeze" />
      </path>
      <text x="4" y={height - 3} fontSize="9" fill={lineColor} opacity="0.8">
        {vals[0] >= 0 ? '+' : ''}{vals[0].toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
      </text>
      <text x={W - 4} y={height - 3} fontSize="9" fill={lineColor} textAnchor="end">
        {vals[vals.length-1] >= 0 ? '+' : ''}{vals[vals.length-1].toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
      </text>
    </svg>
  )
}

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

// Приоритет показа статов — для не-бухгалтеров
const STAT_PRIORITY = {
  trainer: ['last_workout', 'last_distance_km', 'last_pushups', 'weight_kg', 'last_calories', 'steps'],
  secretary: ['pending_tasks', 'next_deadline', 'last_task'],
  chef: ['today_calories', 'today_protein', 'today_carbs', 'avg_day_calories'],
}

function getAccentColor(role, gremlinId) {
  const variants = ROLE_COLOR_VARIANTS[role] || ['#d4a017']
  if (!gremlinId || variants.length === 1) return variants[0]
  const seg = gremlinId.replace(/-/g, '')
  const last8 = seg.slice(-8)
  const num = parseInt(last8, 16) || 0
  return variants[num % variants.length]
}

// Для бухгалтера — строим панель по всем валютам из stats динамически
const CURRENCY_SYMBOLS = {
  THB: '฿', USD: '$', RUB: '₽', EUR: '€', GBP: '£',
  IDR: 'Rp', AUD: 'A$', JPY: '¥', CNY: '¥', KRW: '₩',
  CAD: 'C$', SGD: 'S$', MYR: 'RM', VND: '₫',
}

function getAccountantStatRows(stats) {
  const currencies = new Set()
  Object.keys(stats).forEach(k => {
    if (k.startsWith('expense_') || k.startsWith('income_') || k.startsWith('balance_')) {
      const cur = k.split('_').slice(1).join('_').toUpperCase()
      currencies.add(cur)
    }
  })
  const rows = []
  for (const cur of currencies) {
    const curLow = cur.toLowerCase()
    const exp = stats['expense_' + curLow] || 0
    const inc = stats['income_' + curLow] || 0
    const bal = stats['balance_' + curLow] || 0
    if (exp === 0 && inc === 0) continue
    rows.push({ code: cur, symbol: CURRENCY_SYMBOLS[cur] || cur, exp, inc, bal })
  }
  return rows
}

const SKIP_STAT_KEYS = new Set([
  'last_updated', 'today_date', 'day_log', 'week_log',
  'categories', 'next_tasks', 'last_parsed_task',
])

function getPriorityStats(stats, role) {
  const priority = STAT_PRIORITY[role] || []
  const result = []
  for (const key of priority) {
    const val = stats[key]
    if (val !== undefined && val !== null && val !== 0 && val !== '' && typeof val !== 'object') {
      result.push([key, val])
    }
    if (result.length >= 4) break
  }
  if (result.length < 4) {
    for (const [k, v] of Object.entries(stats)) {
      if (SKIP_STAT_KEYS.has(k)) continue
      if (result.find(([rk]) => rk === k)) continue
      if (v === null || v === undefined || v === 0 || v === '') continue
      if (typeof v === 'object') continue
      result.push([k, v])
      if (result.length >= 4) break
    }
  }
  return result
}

// CategoriesDropdown убран — категории показываются в табе Итого

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
  const [confirmReset, setConfirmReset] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)
  const hasDataTab = ['accountant', 'trainer', 'chef', 'secretary'].includes(gremlin.role)
  const [activeTab, setActiveTab] = useState(hasDataTab ? 'data' : 'chat')
  const [talking, setTalking] = useState(false)
  const [snapshots, setSnapshots] = useState({})
  const [statsPeriod, setStatsPeriod] = useState('month')
  const [allTransactions, setAllTransactions] = useState([])
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const accentColor = getAccentColor(gremlin.role, gremlin.id)
  const theme = getTheme()

  const loadSnapshots = async () => {
    if (gremlin.role !== 'accountant') return
    const stats = gremlin.stats || {}
    const currencies = [...new Set(
      Object.keys(stats)
        .filter(k => k.startsWith('balance_') || k.startsWith('expense_') || k.startsWith('income_'))
        .map(k => k.split('_').slice(1).join('_').toUpperCase())
        .filter(Boolean)
    )]
    if (!currencies.length) return
    try {
      const results = await Promise.all(currencies.map(cur => getSnapshots(gremlin.id, cur).catch(() => [])))
      const snap = {}
      currencies.forEach((cur, i) => { snap[cur] = results[i] || [] })
      setSnapshots(snap)
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'stats') {
      loadSnapshots()
      if (gremlin.role === 'accountant') {
        getTransactions(gremlin.id).then(data => setAllTransactions(Array.isArray(data) ? data : [])).catch(() => {})
      }
    }
  }, [activeTab])

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

  const resetStats = async () => {
    if (!confirmReset) { setConfirmReset(true); return }
    try {
      await updateGremlin(gremlin.id, { stats: {} })
      setGremlin(g => ({ ...g, stats: {} }))
      setConfirmReset(false)
      setEditing(false)
    } catch { alert(lang === 'ru' ? 'Ошибка сброса' : 'Reset error') }
  }

  const send = async (textOverride, silent = false, isFile = false, parsedTotals = null, fileName = null) => {
    const text = textOverride || input.trim()
    if (!text || sending) return
    if (!textOverride) setInput('')
    if (!silent) setMessages(m => [...m, { role: 'user', text, isFile }])
    setSending(true); setTalking(true)
    try {
      const res = await sendChat(userId, gremlin.id, text, isFile, parsedTotals, fileName)
      if (res.stats) {
        setGremlin(g => ({ ...g, stats: res.stats }))
      } else {
        await refreshGremlin()
      }
      const replyText = res.reply || res.gremlin_reply || '...'
      // Обновляем entries и очищаем локальные messages — они теперь в entries
      await refreshEntries()
      setMessages([])
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
    setMessages(m => [...m, { role: 'user', text: '📎 ' + file.name, isFile: true }])

    try {
      const ext = file.name.split('.').pop().toLowerCase()

      if (gremlin.role === 'accountant' && ['json', 'txt', 'csv'].includes(ext)) {
        const { parseTelegramExport, scanFile, formatSummary, totalsToParsed } = await import('../services/fileParser.js')

        let totals = {}
        let opCount = 0

        if (ext === 'json') {
          const text = await file.text()
          try {
            const json = JSON.parse(text)
            if (json.messages) {
              const result = parseTelegramExport(json)
              totals = result.totals
              opCount = result.opCount
            } else {
              totals = scanFile(JSON.stringify(json))
            }
          } catch { totals = {} }
        } else {
          const text = await file.text()
          totals = scanFile(text)
          opCount = Object.keys(totals).length
        }

        if (Object.keys(totals).length === 0) {
          setMessages(m => [...m, {
            role: 'gremlin',
            text: 'Хм, финансовых данных в файле не нашёл. Попробуй написать цифры текстом — например "потратил 500 бат на еду".'
          }])
          setFileLoading(false)
          e.target.value = ''
          return
        }

        const summary = formatSummary(totals)
        const parsedTotals = totalsToParsed(totals)

        // Показываем итог сразу — без ожидания AI
        setMessages(m => [...m, {
          role: 'gremlin',
          text: '📊 Файл обработан (' + opCount + ' операций):\n\n' + summary
        }])

        // Сохраняем — content это имя файла (покажется как 📎 в истории)
        // parsedTotals идут на бэк для обновления stats
        const prompt = 'Файл обработан:\n' + summary + '\nПодтверди кратко что данные записаны.'
        await send(prompt, true, true, parsedTotals, file.name)

      } else {
        // Для других ролей
        let summary = ''
        if (['txt', 'csv'].includes(ext)) {
          const text = await file.text()
          summary = 'Файл "' + file.name + '":\n\n' + text.slice(0, 3000)
        } else if (ext === 'json') {
          const text = await file.text()
          summary = 'JSON файл "' + file.name + '":\n' + text.slice(0, 2000)
        } else if (['docx', 'doc'].includes(ext)) {
          summary = 'Word документ "' + file.name + '" — опиши что там может быть.'
        } else {
          summary = 'Файл "' + file.name + '"'
        }
        await send('Пользователь загрузил файл. Проанализируй:\n\n' + summary, true, true, null)
      }

    } catch (err) {
      console.error('File error:', err)
      setMessages(m => [...m, { role: 'gremlin', text: 'Не смог обработать файл. Напиши данные текстом.' }])
    } finally {
      setFileLoading(false)
      e.target.value = ''
    }
  }

  const stats = gremlin.stats || {}
  const priorityStats = getPriorityStats(stats, gremlin.role)
  const hasStats = priorityStats.length > 0

  // Все видимые entries (не файловые системные записи с огромным контентом)
  // Показываем файловые как "📎 файл" но не их полное содержимое
  const visibleEntries = entries // показываем все, is_file просто рендерится иначе
  // Последние 20 — основной чат (DESC → reverse = хронологически)
  const recentEntries = [...visibleEntries.slice(0, 20)].reverse()
  // Архив — всё что старше 20
  const archiveEntries = [...visibleEntries.slice(20)].reverse()

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
        background: isFairyTheme(theme) ? 'transparent' : 'var(--bg)',
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
              style={{ background: editing ? accentColor + '20' : 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: accentColor, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.03em' }}
            >{lang === 'ru' ? 'Редактировать' : 'Edit'}</button>
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
              <button onClick={handleDelete} style={{ background: confirmDelete ? '#e24b4a' : 'var(--bg3)', color: confirmDelete ? '#fff' : '#e24b4a', border: '1px solid #e24b4a', borderRadius: 6, padding: '7px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                {confirmDelete ? t(lang, 'confirmDelete') : (lang === 'ru' ? 'Удалить' : 'Delete')}
              </button>
            </div>
            {/* Сброс статистики — только для бухгалтера */}
            {gremlin.role === 'accountant' && (
              <button
                onClick={resetStats}
                style={{
                  background: confirmReset ? '#e24b4a20' : 'var(--bg3)',
                  color: confirmReset ? '#e24b4a' : 'var(--text-muted)',
                  border: '1px solid ' + (confirmReset ? '#e24b4a' : 'var(--border)'),
                  borderRadius: 6, padding: '7px 10px', fontSize: 11,
                  cursor: 'pointer', fontFamily: 'inherit', width: '100%'
                }}
              >
                {confirmReset
                  ? (lang === 'ru' ? '⚠️ подтвердить сброс статистики' : '⚠️ confirm reset stats')
                  : (lang === 'ru' ? '↺ сбросить статистику' : '↺ reset stats')}
              </button>
            )}
          </div>
        )}

        {/* PORTRAIT + STATS */}
        <div style={{ flexShrink: 0, marginTop: 5 }}>
          <GremlinAnimation role={gremlin.role} accentColor={accentColor} talking={talking} size={isFairyTheme(theme) ? 110 : 220} theme={theme} />

          {/* БУХГАЛТЕР — таблица по валютам */}
          {gremlin.role === 'accountant' && (() => {
            const currencyRows = getAccountantStatRows(stats)
            const totalUSD = stats.total_balance_usd
            if (currencyRows.length === 0 && !totalUSD) return null
            return (
              <div style={{ padding: '6px 12px' }}>
                {/* Итого в USD */}
                {totalUSD !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <div style={{ background: accentColor + '20', border: '1px solid ' + accentColor + '50', borderRadius: 8, padding: '5px 18px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                        {lang === 'ru' ? 'итого баланс' : 'total balance'}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: totalUSD >= 0 ? accentColor : '#ff5a5a', textShadow: '0 0 10px ' + accentColor + '60' }}>
                        {totalUSD >= 0 ? '+' : ''}{totalUSD?.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $
                      </div>
                    </div>
                  </div>
                )}
                {/* По валютам */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {currencyRows.map(c => (
                    <div key={c.code} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ width: 32, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{c.symbol}</div>
                      <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                        <div style={{ flex: 1, background: '#ff5a5a15', border: '1px solid #ff5a5a30', borderRadius: 6, padding: '3px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#ff5a5a' }}>
                            {(c.exp || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lang === 'ru' ? 'расход' : 'expense'}</div>
                        </div>
                        <div style={{ flex: 1, background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '3px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                            {(c.inc || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lang === 'ru' ? 'доход' : 'income'}</div>
                        </div>
                        <div style={{ flex: 1, background: (c.bal || 0) >= 0 ? '#3ecf7015' : '#ff5a5a15', border: '1px solid ' + ((c.bal || 0) >= 0 ? '#3ecf7030' : '#ff5a5a30'), borderRadius: 6, padding: '3px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: (c.bal || 0) >= 0 ? '#3ecf70' : '#ff5a5a' }}>
                            {(c.bal || 0) >= 0 ? '+' : ''}{(c.bal || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lang === 'ru' ? 'баланс' : 'balance'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Категории расходов — перенесены в таб Итого */}
              </div>
            )
          })()}

          {/* ШЕФ — окошки по дням */}
          {gremlin.role === 'chef' && (() => {
            const dayLog = stats.day_log || []
            if (!dayLog.length) {
              const kcal = stats.today_calories || stats.last_calories
              if (!kcal) return null
              return (
                <div style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
                  <div style={{ background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '5px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{kcal}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>ккал</div>
                  </div>
                </div>
              )
            }
            const today = new Date().toISOString().split('T')[0]
            return (
              <div style={{ display: 'flex', gap: 5, padding: '6px 12px' }}>
                {dayLog.slice(0, 3).map((day, i) => {
                  const isToday = day.date === today
                  const label = isToday ? (lang === 'ru' ? 'сегодня' : 'today') : day.date.slice(5)
                  return (
                    <div key={i} style={{ flex: 1, background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '5px 7px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{day.calories}</div>
                      <div style={{ fontSize: 8, color: accentColor, opacity: 0.7 }}>ккал</div>
                      {day.protein > 0 && <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>Б{day.protein}г</div>}
                      <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* СЕКРЕТАРЬ — задачи плитками */}
          {gremlin.role === 'secretary' && (() => {
            const nextTasks = Array.isArray(stats.next_tasks) ? stats.next_tasks : []
            const pending = stats.pending_tasks || 0
            if (!pending && !nextTasks.length) return null
            const priColor = { high: '#e24b4a', medium: '#d4a017', low: '#68b281' }
            const today = new Date().toISOString().split('T')[0]
            const formatDl = (d) => {
              if (!d) return null
              const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
              if (diff < 0) return { text: lang === 'ru' ? 'просрочено' : 'overdue', color: '#e24b4a' }
              if (diff === 0) return { text: lang === 'ru' ? 'сегодня' : 'today', color: '#e24b4a' }
              if (diff === 1) return { text: lang === 'ru' ? 'завтра' : 'tomorrow', color: '#d4a017' }
              return { text: d.slice(5), color: 'var(--text-muted)' }
            }
            if (!nextTasks.length) {
              return (
                <div style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
                  <div style={{ background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '5px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>{pending}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{lang === 'ru' ? 'задач' : 'tasks'}</div>
                  </div>
                  {stats.next_deadline && (() => { const dl = formatDl(stats.next_deadline); return dl ? (
                    <div style={{ background: dl.color + '15', border: '1px solid ' + dl.color + '30', borderRadius: 6, padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: dl.color }}>{stats.next_deadline}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>deadline</div>
                    </div>
                  ) : null })()}
                </div>
              )
            }
            return (
              <div style={{ display: 'flex', gap: 5, padding: '6px 12px' }}>
                {nextTasks.slice(0, 3).map((task, i) => {
                  const col = priColor[task.priority] || accentColor
                  const dl = formatDl(task.deadline)
                  return (
                    <div key={i} style={{ flex: 1, minWidth: 0, background: col + '15', border: '1px solid ' + col + '35', borderRadius: 6, padding: '5px 6px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      {dl && <div style={{ fontSize: 8, color: dl.color, marginTop: 2, fontWeight: 700 }}>{dl.text}</div>}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* ТРЕНЕР — суммарные плашки за неделю */}
          {gremlin.role === 'trainer' && (
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
              {[
                { val: stats.week_count ?? stats.total_workouts ?? '-', label: lang === 'ru' ? 'тренировок' : 'workouts' },
                { val: stats.week_duration_min ? stats.week_duration_min + (lang === 'ru' ? ' мин' : ' min') : (stats.total_duration_min ? stats.total_duration_min + (lang === 'ru' ? ' мин' : ' min') : '-'), label: lang === 'ru' ? 'время' : 'time' },
                { val: stats.week_calories ? stats.week_calories + ' ккал' : (stats.total_calories ? stats.total_calories + ' ккал' : '-'), label: lang === 'ru' ? 'сожжено' : 'burned' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, background: accentColor + '15', border: '1px solid ' + accentColor + '30', borderRadius: 6, padding: '5px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, textShadow: '0 0 8px ' + accentColor + '80' }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Остальные роли (не accountant, chef, secretary, trainer) — обычные плитки */}
          {gremlin.role !== 'accountant' && gremlin.role !== 'chef' && gremlin.role !== 'secretary' && gremlin.role !== 'trainer' && hasStats && (
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

        {/* ТАБЫ — для всех гремлинов */}
        {hasDataTab && (
          <div style={{ display: 'flex', gap: 3, background: 'var(--bg2)', padding: '4px 12px', flexShrink: 0 }}>
            {[
              { id: 'data', label: gremlin.role === 'accountant' ? '+ Данные' : gremlin.role === 'trainer' ? '+ Трен.' : gremlin.role === 'chef' ? '+ Еда' : '+ Задачи' },
              { id: 'chat', label: <><img src="/Icons/2.png" style={{ width: 13, height: 13, verticalAlign: 'middle', marginRight: 4 }} />{lang === 'ru' ? 'Чат' : 'Chat'}</> },
              ...(gremlin.role === 'accountant' ? [{ id: 'stats', label: lang === 'ru' ? 'Итого' : 'Total' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 6, fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: activeTab === tab.id ? accentColor + '25' : 'var(--bg3)',
                color: activeTab === tab.id ? accentColor : 'var(--text-muted)',
                border: 'none', transition: 'all 0.15s'
              }}>{tab.label}</button>
            ))}
          </div>
        )}

        {/* ФОРМА ДАННЫХ */}
        {hasDataTab && activeTab === 'data' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {gremlin.role === 'accountant' && (
              <AccountantForm gremlinId={gremlin.id} accentColor={accentColor} lang={lang}
                onStatsUpdate={(s) => setGremlin(g => ({ ...g, stats: s }))} />
            )}
            {gremlin.role === 'trainer' && (
              <TrainerForm gremlinId={gremlin.id} accentColor={accentColor} lang={lang}
                onStatsUpdate={(s) => setGremlin(g => ({ ...g, stats: s }))} />
            )}
            {gremlin.role === 'chef' && (
              <ChefForm gremlinId={gremlin.id} accentColor={accentColor} lang={lang}
                onStatsUpdate={(s) => setGremlin(g => ({ ...g, stats: s }))} />
            )}
            {gremlin.role === 'secretary' && (
              <SecretaryForm gremlinId={gremlin.id} accentColor={accentColor} lang={lang}
                onStatsUpdate={(s) => setGremlin(g => ({ ...g, stats: s }))} />
            )}
          </div>
        )}

        {/* ИТОГО — для бухгалтера */}
        {gremlin.role === 'accountant' && activeTab === 'stats' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {(() => {
              const [periodFilter, setPeriodFilter] = [statsPeriod, setStatsPeriod]

              // Считаем категории из реальных транзакций с фильтром по периоду
              const now = new Date()
              const filteredTx = allTransactions.filter(tx => {
                if (!tx.date || tx.type !== 'expense') return false
                const d = new Date(tx.date)
                if (periodFilter === 'week') { const wa = new Date(now); wa.setDate(wa.getDate() - 7); return d >= wa }
                if (periodFilter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
                if (periodFilter === 'year') return d.getFullYear() === now.getFullYear()
                return true
              })
              const catMap = {}
              filteredTx.forEach(tx => {
                const cat = (tx.category || 'другое').toLowerCase()
                if (!catMap[cat]) catMap[cat] = 0
                catMap[cat] = Math.round((catMap[cat] + tx.amount) * 100) / 100
              })
              const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
              const currencyRows = getAccountantStatRows(stats)
              const investments = Object.entries(stats).filter(([k]) => k.startsWith('investment_'))

              const CAT_EMOJI = { 'еда': '🍱', 'кафе': '☕', 'транспорт': '🚗', 'жильё': '🏠', 'здоровье': '💊', 'одежда': '👕', 'развлечения': '🎮', 'связь': '📱', 'food': '🍱', 'cafe': '☕', 'transport': '🚗', 'housing': '🏠', 'health': '💊', 'clothes': '👕', 'entertainment': '🎮', 'telecom': '📱' }
              const PERIOD_LABELS = { week: lang==='ru'?'нед':'wk', month: lang==='ru'?'мес':'mo', year: lang==='ru'?'год':'yr', all: lang==='ru'?'всё':'all' }

              return (
                <>
                  {currencyRows.length === 0 && <div style={{textAlign:'center',color:'var(--text-muted)',fontSize:12,marginTop:20}}>{lang==='ru'?'Добавь первую запись':'Add your first entry'}</div>}

                  {/* Переключатель периода для категорий */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {['week','month','year','all'].map(p => (
                      <button key={p} onClick={() => setPeriodFilter(p)} style={{ flex: 1, padding: '5px 2px', borderRadius: 6, fontFamily: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: periodFilter === p ? accentColor+'25' : 'var(--bg3)', border: '1px solid ' + (periodFilter === p ? accentColor+'60' : 'var(--border)'), color: periodFilter === p ? accentColor : 'var(--text-muted)' }}>
                        {PERIOD_LABELS[p]}
                      </button>
                    ))}
                  </div>

                  {currencyRows.map(c => (
                    <div key={c.code} style={{ marginBottom: 10, background: 'var(--bg2)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <div style={{ width: 32, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{c.symbol}</div>
                        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                          {[
                            { val: c.exp, label: lang==='ru'?'расход':'expense', color: '#e24b4a' },
                            { val: c.inc, label: lang==='ru'?'доход':'income', color: accentColor },
                            { val: c.bal, label: lang==='ru'?'баланс':'balance', color: c.bal>=0?accentColor:'#e24b4a', sign: true },
                          ].map(cell => (
                            <div key={cell.label} style={{ flex:1, background:'var(--bg3)', borderRadius:6, padding:'4px 6px', textAlign:'center' }}>
                              <div style={{ fontSize:12, fontWeight:700, color: cell.color }}>
                                {cell.sign && cell.val>=0?'+':''}{(cell.val||0).toLocaleString('ru-RU',{maximumFractionDigits:2})}
                              </div>
                              <div style={{ fontSize:9, color:'var(--text-muted)' }}>{cell.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Период-фильтр + категории */}
                  {cats.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:'var(--text-muted)',margin:'6px 0 5px',letterSpacing:'0.06em',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>{lang==='ru'?'КАТЕГОРИИ РАСХОДОВ':'EXPENSE CATEGORIES'}</span>
                      </div>
                      {(() => {
                        const totalCats = cats.reduce((s,[,v])=>s+v, 0)
                        return cats.map(([cat, val]) => {
                          const pct = totalCats > 0 ? Math.round((val/totalCats)*100) : 0
                          const emoji = CAT_EMOJI[cat] || '📦'
                          return (
                            <div key={cat} style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',borderRadius:8,padding:'7px 12px',marginBottom:4}}>
                              <span style={{fontSize:14}}>{emoji}</span>
                              <div style={{flex:1,fontSize:12,color:'var(--text)',textTransform:'capitalize'}}>{cat}</div>
                              <div style={{width:60,height:4,background:'var(--bg3)',borderRadius:2,overflow:'hidden'}}>
                                <div style={{width:pct+'%',height:'100%',background:accentColor,borderRadius:2,transition:'width 0.4s'}}/>
                              </div>
                              <div style={{fontSize:10,color:accentColor,minWidth:28,textAlign:'right'}}>{pct}%</div>
                              <div style={{fontSize:10,color:'var(--text-muted)',minWidth:50,textAlign:'right'}}>{val.toLocaleString('ru-RU',{maximumFractionDigits:0})}</div>
                            </div>
                          )
                        })
                      })()}
                    </>
                  )}

                  {investments.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:'var(--text-muted)',margin:'10px 0 5px',letterSpacing:'0.06em'}}>{lang==='ru'?'ВКЛАДЫ':'INVESTMENTS'}</div>
                      {investments.map(([k,v]) => (
                        <div key={k} style={{display:'flex',justifyContent:'space-between',background:'var(--bg2)',borderRadius:8,padding:'8px 12px',marginBottom:4}}>
                          <span style={{fontSize:12,color:'var(--text)'}}>{k.replace('investment_','').toUpperCase()}</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#4a9eff'}}>{v.toLocaleString('ru-RU')}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {(!hasDataTab || activeTab === 'chat') && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: 'transparent' }}>
          {/* АРХИВ — старые записи, хронологически */}
          {showArchive && archiveEntries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>— {t(lang, 'archive')} —</div>
              {archiveEntries.map(e => (
                <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '80%',
                      background: accentColor + '20',
                      color: 'var(--text)',
                      borderRadius: '10px 10px 2px 10px',
                      padding: '7px 11px', fontSize: 13, lineHeight: 1.55, opacity: 0.8,
                      fontStyle: e.is_file ? 'italic' : 'normal'
                    }}>
                      {e.is_file ? '📎 ' + (e.content?.replace('...[файл]', '').trim() || 'файл') : e.content}
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
                <div style={{
                  maxWidth: '80%',
                  background: e.is_file ? accentColor + '20' : accentColor + '25',
                  color: 'var(--text)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '9px 13px', fontSize: 14, lineHeight: 1.55,
                  fontStyle: e.is_file ? 'italic' : 'normal',
                  border: e.is_file ? '1px solid ' + accentColor + '50' : 'none'
                }}>
                  {e.is_file ? '📎 ' + (e.content?.replace('...[файл]', '').trim() || 'файл') : e.content}
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
                  ? (m.isFile ? accentColor + '25' : accentColor + '30')
                  : 'var(--bg2)',
                color: 'var(--text)',
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
        )}

        {/* INPUT — показываем всегда или только в чат-режиме */}
        {(!hasDataTab || activeTab === 'chat') && (
        <div style={{ padding: '10px 12px', background: 'var(--bg2)', borderTop: '1px solid ' + accentColor + '30', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <input ref={fileRef} type="file" accept=".csv,.txt,.json,.html,.htm,.docx,.doc" onChange={handleFile} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={sending || fileLoading}
            style={{ background: 'var(--bg3)', border: '1px solid ' + accentColor + '30', borderRadius: 8, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer', flexShrink: 0, color: accentColor, opacity: sending ? 0.5 : 1 }}
          ><img src="/Icons/4.png" style={{ width: 24, height: 24 }} /></button>
          <textarea
            rows={2}
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
        )}
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
