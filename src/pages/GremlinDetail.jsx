import { useState, useEffect, useRef } from 'react'
import { getEntries, sendChat, updateGremlin, deleteGremlin, getGremlin } from '../services/api'
import { t } from '../i18n'
import Upgrade from './Upgrade'
import GremlinAnimation from '../components/GremlinAnimation'
import AccountantForm from '../components/AccountantForm'
import TrainerForm from '../components/TrainerForm'
import ChefForm from '../components/ChefForm'
import SecretaryForm from '../components/SecretaryForm'

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

function getPriorityStats(stats, role) {
  const priority = STAT_PRIORITY[role] || []
  const result = []
  for (const key of priority) {
    const val = stats[key]
    if (val !== undefined && val !== null && val !== 0 && val !== '') {
      result.push([key, val])
    }
    if (result.length >= 4) break
  }
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

function CategoriesDropdown({ categories, accentColor, lang }) {
  const [open, setOpen] = useState(false)
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1])
  const total = sorted.reduce((s, [, v]) => s + v, 0)

  return (
    <div style={{ marginTop: 6, padding: '0 12px' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', background: accentColor + '10',
          border: '1px solid ' + accentColor + '30', borderRadius: 8,
          padding: '7px 12px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-dim)', fontSize: 11
        }}
      >
        <span>{lang === 'ru' ? '📂 категории расходов' : '📂 expense categories'}</span>
        <span style={{ color: accentColor }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid ' + accentColor + '20',
          borderRadius: '0 0 8px 8px', overflow: 'hidden', marginTop: -1
        }}>
          {sorted.map(([cat, amount]) => {
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0
            return (
              <div key={cat} style={{ padding: '6px 12px', borderBottom: '1px solid ' + accentColor + '10', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 12, color: 'var(--text)', textTransform: 'capitalize' }}>{cat}</div>
                <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: accentColor, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: accentColor, minWidth: 32, textAlign: 'right' }}>{pct}%</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>
                  {amount.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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
  const [confirmReset, setConfirmReset] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState(null)
  const hasDataTab = ['accountant', 'trainer', 'chef', 'secretary'].includes(gremlin.role)
  const [activeTab, setActiveTab] = useState(hasDataTab ? 'data' : 'chat')
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
          <GremlinAnimation role={gremlin.role} accentColor={accentColor} talking={talking} size={220} />

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
                {/* Категории расходов — выпадающий список */}
                {stats.categories && Object.keys(stats.categories).length > 0 && (
                  <CategoriesDropdown categories={stats.categories} accentColor={accentColor} lang={lang} />
                )}
              </div>
            )
          })()}

          {/* ОСТАЛЬНЫЕ РОЛИ — обычные плитки */}
          {gremlin.role !== 'accountant' && hasStats && (
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
              { id: 'data', label: gremlin.role === 'accountant' ? '+ Данные' : gremlin.role === 'trainer' ? '🏋️ Трен.' : gremlin.role === 'chef' ? '🍽️ Еда' : '📋 Задачи' },
              { id: 'chat', label: '💬 Чат' },
              ...(gremlin.role === 'accountant' ? [{ id: 'stats', label: '📊 Итого' }] : []),
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
              const currencyRows = getAccountantStatRows(stats)
              const investments = Object.entries(stats).filter(([k]) => k.startsWith('investment_'))
              const cats = stats.categories ? Object.entries(stats.categories).sort((a,b) => b[1]-a[1]) : []
              const totalExp = Object.entries(stats).filter(([k]) => k.startsWith('expense_')).reduce((s,[,v])=>s+v,0)
              return (
                <>
                  {currencyRows.length === 0 && <div style={{textAlign:'center',color:'var(--text-muted)',fontSize:12,marginTop:20}}>Добавь первую запись</div>}
                  {currencyRows.map(c => (
                    <div key={c.code} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <div style={{ width: 32, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                          {c.symbol}
                        </div>
                        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                          {[
                            { val: c.exp, label: lang==='ru'?'расход':'expense', color: '#e24b4a' },
                            { val: c.inc, label: lang==='ru'?'доход':'income', color: accentColor },
                            { val: c.bal, label: lang==='ru'?'баланс':'balance', color: c.bal>=0?accentColor:'#e24b4a', sign: true },
                          ].map(cell => (
                            <div key={cell.label} style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 6px', textAlign:'center' }}>
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
                  {cats.length > 0 && (
                    <>
                      <div style={{fontSize:10,color:'var(--text-muted)',margin:'10px 0 5px',letterSpacing:'0.06em'}}>{lang==='ru'?'КАТЕГОРИИ РАСХОДОВ':'EXPENSE CATEGORIES'}</div>
                      {cats.map(([cat, val]) => {
                        const pct = totalExp > 0 ? Math.round((val/totalExp)*100) : 0
                        return (
                          <div key={cat} style={{display:'flex',alignItems:'center',gap:8,background:'var(--bg2)',borderRadius:8,padding:'7px 12px',marginBottom:4}}>
                            <div style={{flex:1,fontSize:12,color:'var(--text)',textTransform:'capitalize'}}>{cat}</div>
                            <div style={{width:60,height:4,background:'var(--bg3)',borderRadius:2,overflow:'hidden'}}>
                              <div style={{width:pct+'%',height:'100%',background:accentColor,borderRadius:2}}/>
                            </div>
                            <div style={{fontSize:10,color:accentColor,minWidth:28,textAlign:'right'}}>{pct}%</div>
                            <div style={{fontSize:10,color:'var(--text-muted)',minWidth:50,textAlign:'right'}}>{val.toLocaleString('ru-RU',{maximumFractionDigits:0})}</div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {(!hasDataTab || activeTab === 'chat') && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          >📎</button>
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
