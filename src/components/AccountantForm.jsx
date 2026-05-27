import { useState, useEffect } from 'react'
import { addTransaction, getTransactions, deleteTransaction, getAccounts, addAccount, deleteAccount, getDebts, addDebt, updateDebt, deleteDebt, getSnapshots } from '../services/api'

const ALL_CURRENCIES = [
  { code: 'THB', symbol: '฿' }, { code: 'USD', symbol: '$' }, { code: 'RUB', symbol: '₽' },
  { code: 'IDR', symbol: 'Rp' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
  { code: 'AUD', symbol: 'A$' }, { code: 'JPY', symbol: '¥' }, { code: 'CNY', symbol: '¥' },
  { code: 'KRW', symbol: '₩' }, { code: 'SGD', symbol: 'S$' }, { code: 'MYR', symbol: 'RM' },
  { code: 'GEL', symbol: '₾' }, { code: 'AMD', symbol: '֏' }, { code: 'KZT', symbol: '₸' },
  { code: 'TRY', symbol: '₺' }, { code: 'AED', symbol: 'د.إ' }, { code: 'CAD', symbol: 'C$' },
  { code: 'CHF', symbol: 'Fr' }, { code: 'PLN', symbol: 'zł' }, { code: 'UAH', symbol: '₴' },
  { code: 'BTC', symbol: '₿' }, { code: 'USDT', symbol: '₮' },
]
const SYM = Object.fromEntries(ALL_CURRENCIES.map(c => [c.code, c.symbol]))
const DEFAULT_CATS_RU = ['еда','кафе','транспорт','жильё','здоровье','одежда','развлечения','связь']
const DEFAULT_CATS_EN = ['food','cafe','transport','housing','health','clothes','entertainment','telecom']
const getDefaultCats = (lang) => lang === 'ru' ? DEFAULT_CATS_RU : DEFAULT_CATS_EN
const CAT_ICON = { 'еда': 5, 'кафе': 1, 'транспорт': 3, 'жильё': 7, 'здоровье': 9, 'одежда': 10, 'развлечения': 11, 'связь': 8, 'food': 5, 'cafe': 1, 'transport': 3, 'housing': 7, 'health': 9, 'clothes': 10, 'entertainment': 11, 'telecom': 8 }

const CAT_EMOJI = { 'еда': '🍱', 'кафе': '☕', 'транспорт': '🚗', 'жильё': '🏠', 'здоровье': '💊', 'одежда': '👕', 'развлечения': '🎮', 'связь': '📱', 'food': '🍱', 'cafe': '☕', 'transport': '🚗', 'housing': '🏠', 'health': '💊', 'clothes': '👕', 'entertainment': '🎮', 'telecom': '📱', 'доход': '💵', 'income': '💵' }

function todayStr() { return new Date().toISOString().split('T')[0] }

function formatMonth(dateStr, lang) {
  if (!dateStr) return ''
  const [y, m] = dateStr.split('-')
  const monthsRu = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь']
  const monthsEn = ['january','february','march','april','may','june','july','august','september','october','november','december']
  return (lang === 'ru' ? monthsRu : monthsEn)[parseInt(m) - 1] + ' ' + y
}

function MiniChart({ data, color }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.balance)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const uid = 'mc_' + color.replace('#', '') + '_' + Math.random().toString(36).slice(2, 6)
  const W = 300, H = 44
  const pts = vals.map((v, i) => [
    (i / (vals.length - 1)) * W,
    H - 6 - ((v - min) / range) * (H - 10)
  ])
  const pathD = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const areaD = pathD + ` L${W},${H} L0,${H} Z`
  const isPositive = vals[vals.length - 1] >= vals[0]
  const lineColor = isPositive ? color : '#fc7c6f'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="44" style={{ display: 'block', marginTop: 4 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${uid})`} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray"
          from={`0 ${W * 2}`} to={`${W * 2} 0`}
          dur="0.8s" fill="freeze" />
      </path>
      {pts.length <= 30 && pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={lineColor} opacity="0.7" />
      ))}
    </svg>
  )
}

function CurrencySelect({ value, onChange, style }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const cur = ALL_CURRENCIES.find(c => c.code === value) || ALL_CURRENCIES[0]
  const filtered = search ? ALL_CURRENCIES.filter(c => c.code.toLowerCase().includes(search.toLowerCase())) : ALL_CURRENCIES
  return (
    <div style={{ position: 'relative', ...style }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', height: 38, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', padding: '0 8px' }}>
        {cur.symbol} {cur.code}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 100, maxHeight: 180, overflowY: 'auto' }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: 'none', borderBottom: '1px solid var(--border)', padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
          {filtered.map(c => (
            <button key={c.code} onClick={() => { onChange(c.code); setOpen(false); setSearch('') }}
              style={{ width: '100%', padding: '7px 10px', background: c.code === value ? 'var(--bg3)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, color: c.code === value ? 'var(--accent)' : 'var(--text-dim)', textAlign: 'left' }}>
              {c.symbol} {c.code}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DeleteConfirm({ onConfirm, onCancel, label, lang }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {label && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>}
      <button onClick={onConfirm} style={{ background: '#e24b4a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'ru' ? 'Да' : 'Yes'}</button>
      <button onClick={onCancel} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 5, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'ru' ? 'Нет' : 'No'}</button>
    </div>
  )
}

const ACCOUNT_TABS = [
  { id: 'expenses', labelRu: '↕ Расходы', labelEn: '↕ Expenses', color: '#fc7c6f' },
  { id: 'invest',   labelRu: 'Вклады',    labelEn: 'Invest',      color: '#4173a8' },
  { id: 'accounts', labelRu: 'Счета',     labelEn: 'Accounts',    color: '#b09767' },
  { id: 'debts',    labelRu: 'Долги',     labelEn: 'Debts',       color: '#849cff' },
]

export default function AccountantForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [debts, setDebts] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('expenses')

  useEffect(() => {
    Promise.all([
      getTransactions(gremlinId).catch(() => []),
      getAccounts(gremlinId).catch(() => []),
      getDebts(gremlinId).catch(() => []),
    ]).then(([tx, acc, dbt]) => {
      setTransactions(Array.isArray(tx) ? tx : [])
      setAccounts(Array.isArray(acc) ? acc : [])
      setDebts(Array.isArray(dbt) ? dbt : [])
      const currencies = [...new Set((Array.isArray(tx) ? tx : []).map(t => t.currency))]
      Promise.all(currencies.map(cur => getSnapshots(gremlinId, cur).catch(() => []))).then(results => {
        const snap = {}
        currencies.forEach((cur, i) => { snap[cur] = results[i] || [] })
        setSnapshots(snap)
      })
    }).finally(() => setLoading(false))
  }, [gremlinId])

  // БАГ 2.1: перезагружаем счета с сервера после любой операции затрагивающей баланс
  const refreshAccounts = () => {
    getAccounts(gremlinId).catch(() => []).then(acc => {
      setAccounts(Array.isArray(acc) ? acc : [])
    })
  }

  const expenseTx = transactions.filter(t => t.type === 'expense')
  const incomeTx = transactions.filter(t => t.type === 'income')
  const investTx = transactions.filter(t => t.type === 'investment')
  const transferTx = transactions.filter(t => t.type === 'transfer')

  const handleDeleteTx = async (id) => {
    const result = await deleteTransaction(id, gremlinId).catch(() => null)
    setTransactions(t => t.filter(x => x.id !== id))
    if (result?.stats) onStatsUpdate(result.stats)
    refreshAccounts()
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>...</div>

  // Нет счетов — экран создания первого
  if (accounts.length === 0) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6, fontWeight: 700 }}>
          {lang === 'ru' ? 'Сначала создай счёт' : 'Create an account first'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          {lang === 'ru'
            ? 'Без счёта нельзя фиксировать расходы, доходы, вклады и долги.'
            : 'You need an account to record expenses, income, investments and debts.'}
        </div>
        <QuickCreateAccount gremlinId={gremlinId} onCreated={acc => setAccounts([acc])} lang={lang} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 3, padding: '6px 12px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {ACCOUNT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '6px 2px', borderRadius: 6, fontFamily: 'inherit',
            fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: activeTab === t.id ? t.color + '25' : 'var(--bg3)',
            color: activeTab === t.id ? t.color : 'var(--text-muted)',
            border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}>{lang === 'ru' ? t.labelRu : t.labelEn}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {activeTab === 'expenses' && (
          <ExpenseIncomeForm gremlinId={gremlinId} accounts={accounts} lang={lang}
            transactions={[...expenseTx, ...incomeTx].sort((a, b) => new Date(b.date) - new Date(a.date))}
            snapshots={snapshots}
            onAdd={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats); refreshAccounts() }}
            onDelete={handleDeleteTx}
            onAccountCreated={acc => setAccounts(a => [...a, acc])}
          />
        )}
        {activeTab === 'invest' && (
          <InvestForm gremlinId={gremlinId} accounts={accounts} lang={lang}
            transactions={investTx} snapshots={snapshots}
            onAdd={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats); refreshAccounts() }}
            onDelete={handleDeleteTx}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountsForm gremlinId={gremlinId} accounts={accounts} lang={lang}
            transfers={transferTx}
            onAddAccount={acc => setAccounts(a => [...a, acc])}
            onDeleteAccount={async (id) => { await deleteAccount(id); setAccounts(a => a.filter(x => x.id !== id)) }}
            onAddTransfer={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats); refreshAccounts() }}
          />
        )}
        {activeTab === 'debts' && (
          <DebtsForm gremlinId={gremlinId} accounts={accounts} lang={lang}
            debts={debts}
            onAdd={debt => { setDebts(d => [debt, ...d]); refreshAccounts() }}
            onSettle={async (id) => { await updateDebt(id, { status: 'settled' }); setDebts(d => d.map(x => x.id === id ? { ...x, status: 'settled' } : x)); refreshAccounts() }}
            onDelete={async (id) => { await deleteDebt(id); setDebts(d => d.filter(x => x.id !== id)); refreshAccounts() }}
          />
        )}
      </div>
    </div>
  )
}

// ── QUICK CREATE ──────────────────────────────────────────────────────────────

function QuickCreateAccount({ gremlinId, onCreated, lang }) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [balance, setBalance] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const result = await addAccount(gremlinId, { name: name.trim(), currency, balance: parseFloat(balance) || 0 })
      onCreated(result)
      setName(''); setBalance('')
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder={lang === 'ru' ? 'Название счёта...' : 'Account name...'}
        style={{ background: 'var(--bg3)', border: '1px solid #68b28140', borderRadius: 7, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <CurrencySelect value={currency} onChange={setCurrency} style={{ flex: 1 }} />
        <input type="text" inputMode="decimal" value={balance} onChange={e => setBalance(e.target.value)}
          placeholder={lang === 'ru' ? 'Нач. баланс' : 'Initial balance'}
          style={{ flex: 2, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
      </div>
      <button onClick={handleSave} disabled={saving || !name.trim()}
        style={{ background: '#68b281', color: '#000', border: 'none', borderRadius: 8, padding: '11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        {saving ? '...' : (lang === 'ru' ? 'Создать счёт' : 'Create account')}
      </button>
    </div>
  )
}

// ── EXPENSE / INCOME ──────────────────────────────────────────────────────────

function ExpenseIncomeForm({ gremlinId, accounts, transactions, snapshots, onAdd, onDelete, onAccountCreated, lang }) {
  const [showAll, setShowAll] = useState(false)
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'THB')
  const [txType, setTxType] = useState('expense')
  const [customCats, setCustomCats] = useState(() => { try { return JSON.parse(localStorage.getItem('custom_cats_' + gremlinId) || '[]') } catch { return [] } })
  const [category, setCategory] = useState('еда')
  const [newCatInput, setNewCatInput] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [currencyConflict, setCurrencyConflict] = useState(null)
  const [manualAmount, setManualAmount] = useState('')
  const [conflictMode, setConflictMode] = useState(null)
  const [converting, setConverting] = useState(false)
  const [convertedAmount, setConvertedAmount] = useState(null)
  const [periodFilter, setPeriodFilter] = useState('month') // week | month | year | all

  const currencies = [...new Set(Object.keys(snapshots))]

  const handleAccountChange = (id) => {
    setAccountId(id)
    const acc = accounts.find(a => a.id === id)
    if (acc) { setCurrency(acc.currency); setCurrencyConflict(null) }
  }

  const checkConflict = (accId, cur) => {
    if (txType !== 'income') { setCurrencyConflict(null); return }
    const acc = accounts.find(a => a.id === accId)
    if (acc && acc.currency !== cur) {
      setCurrencyConflict({ account: acc, txCurrency: cur })
      setConflictMode(null); setConvertedAmount(null)
    } else setCurrencyConflict(null)
  }

  const handleCurrencyChange = (cur) => { setCurrency(cur); checkConflict(accountId, cur) }
  const handleTxTypeChange = (t) => {
    setTxType(t)
    if (t !== 'income') setCurrencyConflict(null)
    else checkConflict(accountId, currency)
  }

  const autoConvert = async () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || !currencyConflict) return
    setConverting(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 50,
          messages: [{ role: 'user', content: `Сколько ${currencyConflict.account.currency} за ${num} ${currencyConflict.txCurrency} по текущему среднему курсу? Верни ТОЛЬКО число, без текста.` }] })
      })
      const data = await res.json()
      const parsed = parseFloat((data.content?.[0]?.text || '').replace(/[^0-9.,]/g, '').replace(',', '.'))
      if (parsed > 0) { setConvertedAmount(parsed); setConflictMode('auto_done') }
    } catch { setError(lang === 'ru' ? 'Не удалось получить курс' : 'Could not get rate') }
    setConverting(false)
  }

  const handleSave = async (overrideAmount, overrideCurrency) => {
    const num = parseFloat(String(overrideAmount ?? amount).replace(',', '.'))
    if (!num || num <= 0) { setError(lang === 'ru' ? 'Введи сумму' : 'Enter amount'); return }
    if (!accountId) { setError(lang === 'ru' ? 'Выбери счёт' : 'Select account'); return }
    if (txType === 'income' && currencyConflict && !overrideAmount) { setError(lang === 'ru' ? 'Реши валютный конфликт' : 'Resolve conflict'); return }
    setSaving(true)
    try {
      const cat = txType === 'expense' ? category : null
      const result = await addTransaction(gremlinId, {
        amount: num, currency: overrideCurrency ?? currency, type: txType,
        category: cat, note: note.trim() || null, date, account_id: accountId
      })
      if (result?.transaction) onAdd(result.transaction, result.stats)
      setAmount(''); setNote(''); setDate(todayStr())
      setCurrencyConflict(null); setConvertedAmount(null); setManualAmount(''); setConflictMode(null); setError(null)
    } catch { setError(lang === 'ru' ? 'Ошибка сохранения' : 'Save error') }
    setSaving(false)
  }

  const shown = showAll ? transactions : transactions.slice(0, 3)

  const renderWithSeparators = (list) => {
    const items = []
    let lastDay = null, lastMonth = null
    list.forEach((tx, i) => {
      const day = tx.date
      const month = tx.date ? tx.date.slice(0, 7) : null
      if (month && month !== lastMonth) {
        items.push(
          <div key={'m_' + month} style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', padding: '10px 0 4px', borderTop: i > 0 ? '2px solid var(--border)' : 'none', marginTop: i > 0 ? 6 : 0 }}>
            {formatMonth(tx.date, lang).toUpperCase()}
          </div>
        )
        lastMonth = month; lastDay = null
      } else if (day && day !== lastDay) {
        items.push(
          <div key={'d_' + day + i} style={{ fontSize: 9, color: 'var(--text-muted)', padding: '5px 0 2px', borderTop: '1px solid var(--border)', marginTop: 3 }}>
            {day}
          </div>
        )
        lastDay = day
      }
      items.push(
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 3 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: tx.type === 'expense' ? '#fc7c6f' : '#68b281' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {CAT_EMOJI[tx.category] || CAT_EMOJI[tx.type] || (tx.type === 'income' ? '💵' : '💸')} {tx.category || (tx.type === 'income' ? (lang === 'ru' ? 'доход' : 'income') : tx.type)}
            </div>
            {tx.note && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{tx.note}</div>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'expense' ? '#fc7c6f' : '#68b281', whiteSpace: 'nowrap' }}>
            {tx.type === 'expense' ? '−' : '+'}{Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}
          </div>
          {deleteConfirm === tx.id
            ? <DeleteConfirm lang={lang} onConfirm={() => { onDelete(tx.id); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
            : <button onClick={() => setDeleteConfirm(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
          }
        </div>
      )
      lastDay = day
    })
    return items
  }

  return (
    <>
      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
        {/* Счёт — первый, обязателен */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lang === 'ru' ? 'СЧЁТ' : 'ACCOUNT'}</div>
          <select value={accountId} onChange={e => handleAccountChange(e.target.value)}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setError(null) }}
            placeholder="0" style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, outline: 'none' }} />
          <CurrencySelect value={currency} onChange={handleCurrencyChange} style={{ flex: 1 }} />
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[['expense', lang === 'ru' ? '↓ расход' : '↓ expense', '#fc7c6f'], ['income', lang === 'ru' ? '↑ доход' : '↑ income', '#68b281']].map(([id, label, col]) => (
            <button key={id} onClick={() => handleTxTypeChange(id)} style={{ flex: 1, padding: '8px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: txType === id ? col + '25' : 'var(--bg2)', border: '1px solid ' + (txType === id ? col + '70' : 'var(--border)'), color: txType === id ? col : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {txType === 'expense' && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
              {[...getDefaultCats(lang), ...customCats].map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); setShowNewCat(false) }} style={{ padding: '4px 9px', borderRadius: 20, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', background: category === cat ? '#fc7c6f25' : 'var(--bg2)', border: '1px solid ' + (category === cat ? '#fc7c6f60' : 'var(--border)'), color: category === cat ? '#fc7c6f' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {CAT_ICON[cat] && <img src={`/Icons/${CAT_ICON[cat]}.png`} style={{ width: 11, height: 11 }} />}
                  {cat}
                </button>
              ))}
              <button onClick={() => setShowNewCat(v => !v)} style={{ padding: '4px 9px', borderRadius: 20, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', background: showNewCat ? '#fc7c6f25' : 'var(--bg2)', border: '1px solid ' + (showNewCat ? '#fc7c6f60' : 'var(--border)'), color: showNewCat ? '#fc7c6f' : 'var(--text-muted)' }}>
                + {lang === 'ru' ? 'новая' : 'new'}
              </button>
            </div>
            {showNewCat && (
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                  placeholder={lang === 'ru' ? 'название категории...' : 'category name...'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newCatInput.trim()) {
                      const nc = newCatInput.trim().toLowerCase()
                      const updated = [...customCats.filter(c => c !== nc), nc]
                      setCustomCats(updated)
                      try { localStorage.setItem('custom_cats_' + gremlinId, JSON.stringify(updated)) } catch {}
                      setCategory(nc); setNewCatInput(''); setShowNewCat(false)
                    }
                  }}
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid #fc7c6f40', borderRadius: 7, padding: '6px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
                <button onClick={() => {
                  if (!newCatInput.trim()) return
                  const nc = newCatInput.trim().toLowerCase()
                  const updated = [...customCats.filter(c => c !== nc), nc]
                  setCustomCats(updated)
                  try { localStorage.setItem('custom_cats_' + gremlinId, JSON.stringify(updated)) } catch {}
                  setCategory(nc); setNewCatInput(''); setShowNewCat(false)
                }} style={{ background: '#fc7c6f25', border: '1px solid #fc7c6f60', color: '#fc7c6f', borderRadius: 7, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  OK
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'ru' ? 'Заметка...' : 'Note...'}
            style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
        </div>

        {currencyConflict && (
          <div style={{ background: '#da934c15', border: '1px solid #da934c50', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: '#da934c', fontWeight: 700, marginBottom: 6 }}>! {lang === 'ru' ? 'Валюты не совпадают' : 'Currency mismatch'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
              {currencyConflict.account.name} ({currencyConflict.account.currency}) ← {amount} {SYM[currencyConflict.txCurrency] || currencyConflict.txCurrency}
            </div>
            {!conflictMode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button onClick={() => { setCurrency(currencyConflict.account.currency); setCurrencyConflict(null) }}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  {lang === 'ru' ? `Поменять на ${currencyConflict.account.currency}` : `Switch to ${currencyConflict.account.currency}`}
                </button>
                <button onClick={() => setConflictMode('manual')}
                  style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  {lang === 'ru' ? `Ввести вручную в ${currencyConflict.account.currency}` : `Enter in ${currencyConflict.account.currency}`}
                </button>
                <button onClick={autoConvert} disabled={converting || !amount}
                  style={{ width: '100%', background: '#da934c20', border: '1px solid #da934c50', borderRadius: 7, padding: '8px', fontSize: 11, color: '#da934c', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  {converting ? (lang === 'ru' ? '... считаю курс' : '... fetching rate') : (lang === 'ru' ? 'Конвертировать авто (AI)' : 'Auto convert (AI)')}
                </button>
              </div>
            )}
            {conflictMode === 'manual' && (
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                <input type="text" inputMode="decimal" value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                  placeholder={'0 ' + currencyConflict.account.currency}
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
                <button onClick={() => handleSave(manualAmount, currencyConflict.account.currency)} disabled={saving || !manualAmount}
                  style={{ background: '#68b281', color: '#000', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
              </div>
            )}
            {conflictMode === 'auto_done' && convertedAmount && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {lang === 'ru' ? 'Результат' : 'Result'}: <span style={{ color: '#68b281', fontWeight: 700 }}>{convertedAmount.toLocaleString('ru-RU')} {currencyConflict.account.currency}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleSave(String(convertedAmount), currencyConflict.account.currency)} disabled={saving}
                    style={{ flex: 1, background: '#68b28125', border: '1px solid #68b28160', color: '#68b281', borderRadius: 7, padding: '8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {saving ? '...' : (lang === 'ru' ? 'Подтвердить' : 'Confirm')}
                  </button>
                  <button onClick={() => { setConflictMode(null); setConvertedAmount(null) }}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {lang === 'ru' ? 'Изменить' : 'Change'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <div style={{ fontSize: 11, color: '#fc7c6f', marginBottom: 5 }}>{error}</div>}

        {(!currencyConflict || txType === 'expense') && (
          <button onClick={() => handleSave()} disabled={saving}
            style={{ width: '100%', background: '#fc7c6f25', border: '1px solid #fc7c6f70', color: '#fc7c6f', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {saving ? '...' : (lang === 'ru' ? 'ЗАПИСАТЬ' : 'SAVE')}
          </button>
        )}
      </div>

      {transactions.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>
            {lang === 'ru' ? 'ПОСЛЕДНИЕ ЗАПИСИ' : 'RECENT ENTRIES'}
          </div>
          {renderWithSeparators(shown)}
          {transactions.length > 3 && (
            <button onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '7px', fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
              {showAll ? (lang === 'ru' ? '▲ скрыть' : '▲ hide') : `▼ ${lang === 'ru' ? 'показать все' : 'show all'} (${transactions.length})`}
            </button>
          )}
        </>
      )}
    </>
  )
}

// ── INVEST ────────────────────────────────────────────────────────────────────

function CRTBarChart({ data, color }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.balance)
  const min = Math.min(0, ...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 300, H = 60
  const barW = Math.max(2, Math.floor(W / vals.length) - 1)
  const uid = 'crt_' + color.replace('#','') + '_' + Math.random().toString(36).slice(2,6)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', marginTop: 6 }} preserveAspectRatio="none">
      <defs>
        <filter id={uid + '_glow'}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* CRT scanlines */}
        <pattern id={uid + '_scan'} x="0" y="0" width={W} height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width={W} height="1" fill="rgba(0,0,0,0.18)" />
        </pattern>
      </defs>
      {/* Bars */}
      {vals.map((v, i) => {
        const x = i * (W / vals.length)
        const barH = Math.max(2, ((v - min) / range) * (H - 8))
        const y = H - barH
        const isLast = i === vals.length - 1
        return (
          <g key={i} filter={`url(#${uid + '_glow'})`}>
            <rect x={x + 1} y={y} width={barW} height={barH} fill={isLast ? color : color + '90'} rx="1" />
            {isLast && <rect x={x + 1} y={y} width={barW} height={2} fill="#fff" opacity="0.4" rx="1" />}
          </g>
        )
      })}
      {/* CRT scanlines overlay */}
      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid + '_scan'})`} opacity="0.5" />
      {/* Labels */}
      <text x="2" y={H - 2} fontSize="8" fill={color} opacity="0.8">{vals[0].toLocaleString('ru-RU',{maximumFractionDigits:0})}</text>
      <text x={W - 2} y={H - 2} fontSize="8" fill={color} textAnchor="end">{vals[vals.length-1].toLocaleString('ru-RU',{maximumFractionDigits:0})}</text>
    </svg>
  )
}

function InvestForm({ gremlinId, accounts, transactions, snapshots, onAdd, onDelete, lang }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [rate, setRate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const selectedAcc = accounts.find(a => a.id === accountId)
  const currency = selectedAcc?.currency || 'RUB'

  const handleSave = async () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || num <= 0) { setError(lang === 'ru' ? 'Введи сумму' : 'Enter amount'); return }
    if (!accountId) { setError(lang === 'ru' ? 'Выбери счёт' : 'Select account'); return }
    setSaving(true)
    try {
      const result = await addTransaction(gremlinId, {
        amount: num, currency, type: 'investment',
        note: note.trim() || null, rate: rate ? parseFloat(rate) : null,
        end_date: endDate || null, date: todayStr(), account_id: accountId,
      })
      if (result?.transaction) onAdd(result.transaction, result.stats)
      setAmount(''); setNote(''); setRate(''); setEndDate(''); setError(null)
    } catch { setError(lang === 'ru' ? 'Ошибка сохранения' : 'Save error') }
    setSaving(false)
  }

  const byCurrency = {}
  transactions.forEach(tx => { if (!byCurrency[tx.currency]) byCurrency[tx.currency] = 0; byCurrency[tx.currency] += tx.amount })

  return (
    <>
      {Object.entries(byCurrency).map(([cur, total]) => {
        const data = snapshots[cur] || []
        const color = '#4173a8'
        return (
          <div key={cur} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
              <span>{lang === 'ru' ? 'Вклады' : 'Investments'} {cur}</span>
              <span style={{ color, fontWeight: 700 }}>{total.toLocaleString('ru-RU')} {SYM[cur] || cur}</span>
            </div>
            <CRTBarChart data={data} color={color} />
          </div>
        )
      })}

      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lang === 'ru' ? 'СЧЁТ' : 'ACCOUNT'}</div>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setError(null) }}
            placeholder={lang === 'ru' ? 'сумма' : 'amount'}
            style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)' }}>
            {SYM[currency] || currency}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)}
            placeholder={lang === 'ru' ? '% год. (необяз.)' : '% annual (opt.)'}
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid #4173a840', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid #4173a840', borderRadius: 7, padding: '8px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
        </div>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={lang === 'ru' ? 'название вклада...' : 'investment name...'}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
        {error && <div style={{ fontSize: 11, color: '#fc7c6f', marginBottom: 5 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', background: '#4173a825', border: '1px solid #4173a870', color: '#4173a8', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : (lang === 'ru' ? 'ДОБАВИТЬ ВКЛАД' : 'ADD INVESTMENT')}
        </button>
      </div>

      {transactions.map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4173a8', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text)' }}>{tx.note || (lang === 'ru' ? 'вклад' : 'investment')}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {tx.rate ? tx.rate + '% ' : ''}
              {tx.end_date ? (lang === 'ru' ? 'до ' : 'until ') + tx.end_date : (lang === 'ru' ? 'бессрочно' : 'open-ended')}
              {tx.date ? ' · ' + tx.date : ''}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4173a8', whiteSpace: 'nowrap' }}>
            {Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}
          </div>
          {deleteConfirm === tx.id
            ? <DeleteConfirm lang={lang} onConfirm={() => { onDelete(tx.id); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
            : <button onClick={() => setDeleteConfirm(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
          }
        </div>
      ))}
    </>
  )
}

// ── ACCOUNTS ──────────────────────────────────────────────────────────────────

function AccountsForm({ gremlinId, accounts, transfers, onAddAccount, onDeleteAccount, onAddTransfer, lang }) {
  const [newName, setNewName] = useState('')
  const [newCurrency, setNewCurrency] = useState('RUB')
  const [newBalance, setNewBalance] = useState('')
  const [fromId, setFromId] = useState(accounts[0]?.id || '')
  const [toId, setToId] = useState(accounts[1]?.id || '')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('account')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleAddAccount = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const result = await addAccount(gremlinId, { name: newName.trim(), currency: newCurrency, balance: parseFloat(newBalance) || 0 })
      onAddAccount(result)
      setNewName(''); setNewBalance('')
    } catch {}
    setSaving(false)
  }

  const handleTransfer = async () => {
    const num = parseFloat(String(fromAmount).replace(',', '.'))
    if (!num || !fromId || !toId) return
    const fromAcc = accounts.find(a => a.id === fromId)
    setSaving(true)
    try {
      const result = await addTransaction(gremlinId, {
        amount: num, currency: fromAcc?.currency || 'USD', type: 'transfer',
        note: note || (fromAcc?.name + ' → ' + accounts.find(a => a.id === toId)?.name),
        account_id: fromId, to_account_id: toId, date: todayStr(),
      })
      if (result?.transaction) onAddTransfer(result.transaction, result.stats)
      setFromAmount(''); setToAmount(''); setNote('')
    } catch {}
    setSaving(false)
  }

  return (
    <>
      {accounts.map(acc => (
        <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '8px 10px', marginBottom: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b09767', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700 }}>{acc.name}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#b09767', whiteSpace: 'nowrap' }}>
            {Number(acc.balance || 0).toLocaleString('ru-RU')} {SYM[acc.currency] || acc.currency}
          </div>
          {deleteConfirm === acc.id
            ? <DeleteConfirm lang={lang} onConfirm={() => { onDeleteAccount(acc.id); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
            : <button onClick={() => setDeleteConfirm(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
          }
        </div>
      ))}

      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8, marginTop: 6 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[['account', lang === 'ru' ? '+ счёт' : '+ account'], ['transfer', lang === 'ru' ? '⇄ перевод' : '⇄ transfer']].map(([id, label]) => (
            <button key={id} onClick={() => setMode(id)} style={{ flex: 1, padding: '7px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: mode === id ? '#b0976725' : 'var(--bg2)', border: '1px solid ' + (mode === id ? '#b0976770' : 'var(--border)'), color: mode === id ? '#b09767' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'account' ? (
          <>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder={lang === 'ru' ? 'Название счёта...' : 'Account name...'}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <CurrencySelect value={newCurrency} onChange={setNewCurrency} style={{ flex: 1 }} />
              <input type="text" inputMode="decimal" value={newBalance} onChange={e => setNewBalance(e.target.value)}
                placeholder={lang === 'ru' ? 'нач. баланс' : 'initial balance'}
                style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            </div>
            <button onClick={handleAddAccount} disabled={saving || !newName.trim()}
              style={{ width: '100%', background: '#b0976725', border: '1px solid #b0976770', color: '#b09767', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? '...' : (lang === 'ru' ? 'ДОБАВИТЬ СЧЁТ' : 'ADD ACCOUNT')}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <select value={fromId} onChange={e => setFromId(e.target.value)}
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
              <select value={toId} onChange={e => setToId(e.target.value)}
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}>
                {accounts.filter(a => a.id !== fromId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" inputMode="decimal" value={fromAmount} onChange={e => setFromAmount(e.target.value)}
                placeholder={lang === 'ru' ? 'списать' : 'debit'}
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
              <input type="text" inputMode="decimal" value={toAmount} onChange={e => setToAmount(e.target.value)}
                placeholder={lang === 'ru' ? 'зачислить' : 'credit'}
                style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'ru' ? 'заметка...' : 'note...'}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
            <button onClick={handleTransfer} disabled={saving}
              style={{ width: '100%', background: '#b0976725', border: '1px solid #b0976770', color: '#b09767', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? '...' : (lang === 'ru' ? 'ЗАПИСАТЬ ПЕРЕВОД' : 'SAVE TRANSFER')}
            </button>
          </>
        )}
      </div>

      {transfers.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.06em' }}>{lang === 'ru' ? 'ПЕРЕВОДЫ' : 'TRANSFERS'}</div>
          {transfers.map(tx => (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b09767', flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.note || (lang === 'ru' ? 'перевод' : 'transfer')} · {tx.date}</div></div>
              <div style={{ fontSize: 11, color: '#b09767' }}>{Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}</div>
            </div>
          ))}
        </>
      )}
    </>
  )
}

// ── DEBTS ─────────────────────────────────────────────────────────────────────

function DebtsForm({ gremlinId, accounts, debts, onAdd, onSettle, onDelete, lang }) {
  const [direction, setDirection] = useState('gave')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [settleConfirm, setSettleConfirm] = useState(null)

  const selectedAcc = accounts.find(a => a.id === accountId)
  const currency = selectedAcc?.currency || 'USD'
  const active = debts.filter(d => d.status === 'active')
  const settled = debts.filter(d => d.status === 'settled')

  const handleSave = async () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || !person.trim() || !accountId) return
    setSaving(true)
    try {
      const result = await addDebt(gremlinId, { direction, person: person.trim(), amount: num, currency, note: note.trim() || null, account_id: accountId })
      onAdd(result)
      setPerson(''); setAmount(''); setNote('')
    } catch {}
    setSaving(false)
  }

  const dirColor = direction === 'gave' ? '#849cff' : '#da934c'

  return (
    <>
      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[['gave', lang === 'ru' ? '→ дал' : '→ lent', '#849cff'], ['took', lang === 'ru' ? '← взял' : '← borrowed', '#da934c']].map(([id, label, col]) => (
            <button key={id} onClick={() => setDirection(id)} style={{ flex: 1, padding: '8px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: direction === id ? col + '25' : 'var(--bg2)', border: '1px solid ' + (direction === id ? col + '70' : 'var(--border)'), color: direction === id ? col : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lang === 'ru' ? 'СЧЁТ' : 'ACCOUNT'}</div>
          <select value={accountId} onChange={e => setAccountId(e.target.value)}
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
          </select>
        </div>
        <input value={person} onChange={e => setPerson(e.target.value)}
          placeholder={direction === 'gave' ? (lang === 'ru' ? 'кому...' : 'to whom...') : (lang === 'ru' ? 'от кого...' : 'from whom...')}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={lang === 'ru' ? 'сумма' : 'amount'}
            style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', borderRadius: 7, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-muted)', height: 36 }}>
            {SYM[currency] || currency}
          </div>
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder={lang === 'ru' ? 'заметка...' : 'note...'}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', background: dirColor + '25', border: '1px solid ' + dirColor + '70', color: dirColor, borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : (lang === 'ru' ? 'ЗАПИСАТЬ' : 'SAVE')}
        </button>
      </div>

      {active.length > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.06em' }}>{lang === 'ru' ? 'АКТИВНЫЕ' : 'ACTIVE'}</div>}
      {active.map(d => (
        <div key={d.id} style={{ background: 'var(--bg3)', borderRadius: 7, padding: '8px 10px', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: d.direction === 'gave' ? '#849cff' : '#da934c', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text)' }}>
                {d.direction === 'gave' ? (lang === 'ru' ? 'дал ' : 'lent to ') : (lang === 'ru' ? 'взял у ' : 'borrowed from ')}{d.person}
              </div>
              {d.note && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.note}</div>}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: d.direction === 'gave' ? '#849cff' : '#da934c', whiteSpace: 'nowrap' }}>
              {Number(d.amount).toLocaleString('ru-RU')} {SYM[d.currency] || d.currency}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
            {settleConfirm === d.id
              ? <DeleteConfirm lang={lang} label={lang === 'ru' ? 'Отметить возвращённым?' : 'Mark as settled?'} onConfirm={() => { onSettle(d.id); setSettleConfirm(null) }} onCancel={() => setSettleConfirm(null)} />
              : <button onClick={() => setSettleConfirm(d.id)} style={{ background: '#68b28120', border: '1px solid #68b28140', color: '#68b281', borderRadius: 5, padding: '3px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {lang === 'ru' ? 'вернул' : 'settled'}
                </button>
            }
            {deleteConfirm === d.id
              ? <DeleteConfirm lang={lang} onConfirm={() => { onDelete(d.id); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
              : <button onClick={() => setDeleteConfirm(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
            }
          </div>
        </div>
      ))}

      {settled.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', margin: '8px 0 5px', letterSpacing: '0.06em' }}>{lang === 'ru' ? 'ЗАКРЫТЫЕ' : 'SETTLED'}</div>
          {settled.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4, opacity: 0.5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {d.direction === 'gave' ? (lang === 'ru' ? 'дал ' : 'lent ') : (lang === 'ru' ? 'взял у ' : 'borrowed ')}{d.person}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>{Number(d.amount).toLocaleString('ru-RU')} {SYM[d.currency] || d.currency}</div>
              {deleteConfirm === d.id
                ? <DeleteConfirm lang={lang} onConfirm={() => { onDelete(d.id); setDeleteConfirm(null) }} onCancel={() => setDeleteConfirm(null)} />
                : <button onClick={() => setDeleteConfirm(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 13, padding: '0 2px' }}>✕</button>
              }
            </div>
          ))}
        </>
      )}
    </>
  )
}
