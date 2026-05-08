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
const EXPENSE_CATS = ['еда', 'кафе', 'транспорт', 'жильё', 'здоровье', 'одежда', 'развлечения', 'связь', 'другое']

function todayStr() { return new Date().toISOString().split('T')[0] }

// Мини-график балансов
function MiniChart({ data, color }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.balance)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  return (
    <svg width="100%" height="40" style={{ display: 'block', marginTop: 4 }}>
      <defs>
        <linearGradient id={'g_' + color.replace('#', '')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {(() => {
        const n = vals.length
        const w = 100 / (n - 1)
        const pts = vals.map((v, i) => [i * w, 36 - ((v - min) / range) * 32])
        const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + '% ' + p[1]).join(' ')
        const areaD = pathD + ' L100% 40 L0% 40 Z'
        return (
          <>
            <path d={areaD} fill={'url(#g_' + color.replace('#', '') + ')'} />
            <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </>
        )
      })()}
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

const ACCOUNT_TABS = [
  { id: 'expenses', label: '↕ Расходы', color: '#fc7c6f' },
  { id: 'invest',   label: 'Вклады',    color: '#4173a8' },
  { id: 'accounts', label: 'Счета',     color: '#b09767' },
  { id: 'debts',    label: 'Долги',     color: '#849cff' },
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

  const expenseTx = transactions.filter(t => t.type === 'expense')
  const incomeTx = transactions.filter(t => t.type === 'income')
  const investTx = transactions.filter(t => t.type === 'investment')
  const transferTx = transactions.filter(t => t.type === 'transfer')

  const handleDeleteTx = async (id) => {
    const result = await deleteTransaction(id, gremlinId)
    setTransactions(t => t.filter(x => x.id !== id))
    if (result?.stats) onStatsUpdate(result.stats)
  }

  if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>...</div>

  const tab = ACCOUNT_TABS.find(t => t.id === activeTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ТАБЫ */}
      <div style={{ display: 'flex', gap: 3, padding: '6px 12px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {ACCOUNT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '6px 2px', borderRadius: 6, fontFamily: 'inherit',
            fontSize: 10, fontWeight: 700, cursor: 'pointer',
            background: activeTab === t.id ? t.color + '25' : 'var(--bg3)',
            color: activeTab === t.id ? t.color : 'var(--text-muted)',
            border: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      {/* КОНТЕНТ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {activeTab === 'expenses' && (
          <ExpenseIncomeForm
            gremlinId={gremlinId}
            accounts={accounts}
            transactions={[...expenseTx, ...incomeTx].sort((a, b) => new Date(b.date) - new Date(a.date))}
            snapshots={snapshots}
            onAdd={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats) }}
            onDelete={handleDeleteTx}
            onAccountCreated={acc => setAccounts(a => [...a, acc])}
          />
        )}
        {activeTab === 'invest' && (
          <InvestForm
            gremlinId={gremlinId}
            transactions={investTx}
            snapshots={snapshots}
            onAdd={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats) }}
            onDelete={handleDeleteTx}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountsForm
            gremlinId={gremlinId}
            accounts={accounts}
            transfers={transferTx}
            onAddAccount={acc => setAccounts(a => [...a, acc])}
            onDeleteAccount={async (id) => { await deleteAccount(id); setAccounts(a => a.filter(x => x.id !== id)) }}
            onAddTransfer={(tx, stats) => { setTransactions(t => [tx, ...t]); if (stats) onStatsUpdate(stats) }}
          />
        )}
        {activeTab === 'debts' && (
          <DebtsForm
            gremlinId={gremlinId}
            debts={debts}
            onAdd={debt => setDebts(d => [debt, ...d])}
            onSettle={async (id) => { await updateDebt(id, { status: 'settled' }); setDebts(d => d.map(x => x.id === id ? { ...x, status: 'settled' } : x)) }}
            onDelete={async (id) => { await deleteDebt(id); setDebts(d => d.filter(x => x.id !== id)) }}
          />
        )}
      </div>
    </div>
  )
}

// ── SUB-FORMS ──────────────────────────────────────────────────────────────────

const CAT_ICON = { 'еда': 5, 'кафе': 1, 'транспорт': 3, 'жильё': 7, 'здоровье': 9, 'одежда': 10, 'развлечения': 11, 'связь': 8 }

function ExpenseIncomeForm({ gremlinId, accounts, transactions, snapshots, onAdd, onDelete, onAccountCreated }) {
  const [showAll, setShowAll] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('THB')
  const [txType, setTxType] = useState('expense')
  const [category, setCategory] = useState('еда')
  const [customCat, setCustomCat] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [accountId, setAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Валютный конфликт
  const [currencyConflict, setCurrencyConflict] = useState(null) // { account, txCurrency }
  const [manualAmount, setManualAmount] = useState('')
  const [conflictMode, setConflictMode] = useState(null) // 'change' | 'manual' | 'auto'
  const [converting, setConverting] = useState(false)
  const [convertedAmount, setConvertedAmount] = useState(null)

  const currencies = [...new Set(Object.keys(snapshots))]

  // Проверяем валютный конфликт при выборе счёта или валюты
  const checkConflict = (accId, cur) => {
    if (txType !== 'income') { setCurrencyConflict(null); return }
    if (!accId) { setCurrencyConflict(null); return }
    const acc = accounts.find(a => a.id === accId)
    if (acc && acc.currency !== cur) {
      setCurrencyConflict({ account: acc, txCurrency: cur })
      setConflictMode(null)
      setConvertedAmount(null)
    } else {
      setCurrencyConflict(null)
    }
  }

  const handleAccountChange = (id) => {
    setAccountId(id)
    checkConflict(id, currency)
  }

  const handleCurrencyChange = (cur) => {
    setCurrency(cur)
    checkConflict(accountId, cur)
  }

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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{
            role: 'user',
            content: `Сколько ${currencyConflict.account.currency} за ${num} ${currencyConflict.txCurrency} по текущему среднему курсу? Верни ТОЛЬКО число, без текста.`
          }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text?.trim() || ''
      const parsed = parseFloat(text.replace(/[^0-9.,]/g, '').replace(',', '.'))
      if (parsed > 0) {
        setConvertedAmount(parsed)
        setConflictMode('auto_done')
      }
    } catch {
      setError('Не удалось получить курс')
    }
    setConverting(false)
  }

  const handleSave = async (overrideAmount, overrideCurrency) => {
    const num = parseFloat(String(overrideAmount ?? amount).replace(',', '.'))
    if (!num || num <= 0) { setError('Введи сумму'); return }

    // Если доход и есть конфликт — не решён ещё
    if (txType === 'income' && currencyConflict && !overrideAmount) {
      setError('Реши валютный конфликт выше')
      return
    }

    setSaving(true)
    try {
      const cat = txType === 'expense' ? (category === 'другое' ? (customCat.trim() || 'другое') : category) : null
      const finalCurrency = overrideCurrency ?? currency
      const result = await addTransaction(gremlinId, {
        amount: num, currency: finalCurrency, type: txType,
        category: cat, note: note.trim() || null, date,
        account_id: accountId || null
      })
      if (result?.transaction) onAdd(result.transaction, result.stats)
      setAmount(''); setNote(''); setDate(todayStr())
      setCurrencyConflict(null); setConvertedAmount(null)
      setManualAmount(''); setConflictMode(null); setError(null)
    } catch { setError('Ошибка сохранения') }
    setSaving(false)
  }

  const shown = showAll ? transactions : transactions.slice(0, 3)

  return (
    <>
      {/* Графики */}
      {currencies.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {currencies.slice(0, 3).map(cur => {
            const data = snapshots[cur] || []
            if (data.length < 2) return null
            const last = data[data.length - 1]?.balance || 0
            const color = last >= 0 ? '#68b281' : '#fc7c6f'
            return (
              <div key={cur} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>{cur}</span>
                  <span style={{ color, fontWeight: 700 }}>{last >= 0 ? '+' : ''}{last.toLocaleString('ru-RU')}</span>
                </div>
                <MiniChart data={data} color={color} />
              </div>
            )
          })}
        </div>
      )}

      {/* Форма — всегда открыта */}
      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 10 }}>

          {/* Сумма + валюта */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="text" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setError(null) }}
              placeholder="0" style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, outline: 'none' }} />
            <CurrencySelect value={currency} onChange={handleCurrencyChange} style={{ flex: 1 }} />
          </div>

          {/* Тип */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {[['expense', '↓ расход', '#fc7c6f'], ['income', '↑ доход', '#68b281']].map(([id, label, col]) => (
              <button key={id} onClick={() => handleTxTypeChange(id)} style={{ flex: 1, padding: '8px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: txType === id ? col + '25' : 'var(--bg2)', border: '1px solid ' + (txType === id ? col + '70' : 'var(--border)'), color: txType === id ? col : 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Категории расходов */}
          {txType === 'expense' && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {EXPENSE_CATS.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} style={{ padding: '4px 9px', borderRadius: 20, fontFamily: 'inherit', fontSize: 10, cursor: 'pointer', background: category === cat ? '#fc7c6f25' : 'var(--bg2)', border: '1px solid ' + (category === cat ? '#fc7c6f60' : 'var(--border)'), color: category === cat ? '#fc7c6f' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {CAT_ICON[cat] && <img src={`/Icons/${CAT_ICON[cat]}.png`} style={{ width: 11, height: 11 }} />}
                  {cat}
                </button>
              ))}
            </div>
          )}
          {category === 'другое' && txType === 'expense' && (
            <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="своя категория..."
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
          )}

          {/* Заметка + дата */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка..."
              style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
          </div>

          {/* Счёт — для дохода обязателен */}
          {txType === 'income' && accounts.length === 0 ? (
            <div style={{ background: '#68b28115', border: '1px solid #68b28140', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#68b281', marginBottom: 8, fontWeight: 700 }}>
                Сначала создай счёт — куда зачислять доход?
              </div>
              <QuickCreateAccount gremlinId={gremlinId} onCreated={onAccountCreated} />
            </div>
          ) : accounts.length > 0 && (
            <select value={accountId} onChange={e => handleAccountChange(e.target.value)}
              style={{ width: '100%', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
              <option value="">Счёт не выбран</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
          )}

          {/* Валютный конфликт */}
          {currencyConflict && (
            <div style={{ background: '#da934c15', border: '1px solid #da934c50', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: '#da934c', fontWeight: 700, marginBottom: 8 }}>
                ! Валюты не совпадают
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
                Счёт: {currencyConflict.account.name} ({currencyConflict.account.currency}), сумма: {amount} {SYM[currencyConflict.txCurrency] || currencyConflict.txCurrency}
              </div>

              {!conflictMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <button onClick={() => { setCurrency(currencyConflict.account.currency); setCurrencyConflict(null) }}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    Поменять валюту на {currencyConflict.account.currency}
                  </button>
                  <button onClick={() => setConflictMode('manual')}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    Ввести сумму вручную в {currencyConflict.account.currency}
                  </button>
                  <button onClick={autoConvert} disabled={converting || !amount}
                    style={{ width: '100%', background: '#da934c20', border: '1px solid #da934c50', borderRadius: 7, padding: '8px', fontSize: 11, color: '#da934c', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    {converting ? '... считаю курс' : 'Конвертировать авто (AI)'}
                  </button>
                </div>
              )}

              {conflictMode === 'manual' && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Введи сумму в {currencyConflict.account.currency}:
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" inputMode="decimal" value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                      placeholder={'0 ' + currencyConflict.account.currency}
                      style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
                    <button onClick={() => handleSave(manualAmount, currencyConflict.account.currency)} disabled={saving || !manualAmount}
                      style={{ background: '#68b281', color: '#000', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
              )}

              {conflictMode === 'auto_done' && convertedAmount && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    Результат: <span style={{ color: '#68b281', fontWeight: 700 }}>{convertedAmount.toLocaleString('ru-RU')} {currencyConflict.account.currency}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleSave(String(convertedAmount), currencyConflict.account.currency)} disabled={saving}
                      style={{ flex: 1, background: '#68b28125', border: '1px solid #68b28160', color: '#68b281', borderRadius: 7, padding: '8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? '...' : 'Подтвердить'}
                    </button>
                    <button onClick={() => { setConflictMode(null); setConvertedAmount(null) }}
                      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 7, padding: '8px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Изменить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div style={{ fontSize: 11, color: '#fc7c6f', marginBottom: 5 }}>{error}</div>}

          {/* Кнопка записать */}
          {(!currencyConflict || txType === 'expense') && (
            <button onClick={() => handleSave()} disabled={saving || (txType === 'income' && accounts.length === 0)}
              style={{ width: '100%', background: '#fc7c6f25', border: '1px solid #fc7c6f70', color: '#fc7c6f', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (txType === 'income' && accounts.length === 0) ? 0.4 : 1 }}>
              {saving ? '...' : 'ЗАПИСАТЬ'}
            </button>
          )}
        </div>

      {/* Список — 3 последних + раскрыть */}
      {transactions.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>
            ПОСЛЕДНИЕ ЗАПИСИ
          </div>
          {shown.map(tx => (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: tx.type === 'expense' ? '#fc7c6f' : '#68b281' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.category || (tx.type === 'income' ? 'доход' : tx.type)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{tx.note ? tx.note + ' · ' : ''}{tx.date}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'expense' ? '#fc7c6f' : '#68b281', whiteSpace: 'nowrap' }}>
                {tx.type === 'expense' ? '−' : '+'}{Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}
              </div>
              <button onClick={() => onDelete(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
            </div>
          ))}
          {transactions.length > 3 && (
            <button onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '7px', fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {showAll ? '▲ скрыть' : `▼ показать все (${transactions.length})`}
            </button>
          )}
        </>
      )}
    </>
  )
}

// Быстрое создание счёта (встроенная форма для случая "нет счетов")
function QuickCreateAccount({ gremlinId, onCreated }) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const result = await addAccount(gremlinId, { name: name.trim(), currency, balance: 0 })
      onCreated(result)
      setName('')
    } catch {}
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="название счёта (напр. ПСБ)"
        style={{ background: 'var(--bg3)', border: '1px solid #68b28140', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
      <div style={{ display: 'flex', gap: 6 }}>
        <CurrencySelect value={currency} onChange={setCurrency} style={{ flex: 1 }} />
        <button onClick={handleSave} disabled={saving || !name.trim()}
          style={{ flex: 2, background: '#68b281', color: '#000', border: 'none', borderRadius: 7, padding: '8px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : 'Создать счёт'}
        </button>
      </div>
    </div>
  )
}

function InvestForm({ gremlinId, transactions, snapshots, onAdd, onDelete }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('RUB')
  const [note, setNote] = useState('')
  const [rate, setRate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || num <= 0) return
    setSaving(true)
    try {
      const result = await addTransaction(gremlinId, { amount: num, currency, type: 'investment', note: note.trim() || null, rate: rate ? parseFloat(rate) : null, end_date: endDate || null, date: todayStr() })
      if (result?.transaction) onAdd(result.transaction, result.stats)
      setAmount(''); setNote(''); setRate(''); setEndDate('')
    } catch {}
    setSaving(false)
  }

  const byCurrency = {}
  transactions.forEach(tx => { if (!byCurrency[tx.currency]) byCurrency[tx.currency] = 0; byCurrency[tx.currency] += tx.amount })

  return (
    <>
      {Object.entries(byCurrency).map(([cur, total]) => {
        const data = snapshots[cur] || []
        return (
          <div key={cur} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>
              <span>Вклады {cur}</span>
              <span style={{ color: '#4173a8', fontWeight: 700 }}>{total.toLocaleString('ru-RU')} {SYM[cur] || cur}</span>
            </div>
            <MiniChart data={data} color="#4173a8" />
          </div>
        )
      })}

      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="сумма"
            style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
          <CurrencySelect value={currency} onChange={setCurrency} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="% год."
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid #4173a840', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ flex: 1, background: 'var(--bg2)', border: '1px solid #4173a840', borderRadius: 7, padding: '8px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }} />
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="название вклада/инвестиции..."
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: '#4173a825', border: '1px solid #4173a870', color: '#4173a8', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : 'ДОБАВИТЬ ВКЛАД'}
        </button>
      </div>

      {transactions.map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4173a8', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text)' }}>{tx.note || 'вклад'}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
              {tx.rate ? tx.rate + '% год' : ''}{tx.rate && tx.end_date ? ' · ' : ''}{tx.end_date ? 'до ' + tx.end_date : ''}{tx.date ? ' · ' + tx.date : ''}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#4173a8', whiteSpace: 'nowrap' }}>
            {Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}
          </div>
          <button onClick={() => onDelete(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
        </div>
      ))}
    </>
  )
}

function AccountsForm({ gremlinId, accounts, transfers, onAddAccount, onDeleteAccount, onAddTransfer }) {
  const [newName, setNewName] = useState('')
  const [newCurrency, setNewCurrency] = useState('RUB')
  const [newBalance, setNewBalance] = useState('')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('account')

  const handleAddAccount = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const result = await addAccount(gremlinId, { name: newName.trim(), currency: newCurrency, balance: parseFloat(newBalance) || 0 })
      onAddAccount(result)
      setNewName(''); setNewBalance(''); setFormOpen(false)
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
      setFromAmount(''); setToAmount(''); setNote(''); setFormOpen(false)
    } catch {}
    setSaving(false)
  }

  return (
    <>
      {accounts.map(acc => (
        <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b09767', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text)' }}>{acc.name}</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#b09767', whiteSpace: 'nowrap' }}>
            {Number(acc.balance || 0).toLocaleString('ru-RU')} {SYM[acc.currency] || acc.currency}
          </div>
          <button onClick={() => onDeleteAccount(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
        </div>
      ))}

      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {[['account', '+ счёт'], ['transfer', '⇄ перевод']].map(([id, label]) => (
              <button key={id} onClick={() => setMode(id)} style={{ flex: 1, padding: '7px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: mode === id ? '#b0976725' : 'var(--bg2)', border: '1px solid ' + (mode === id ? '#b0976770' : 'var(--border)'), color: mode === id ? '#b09767' : 'var(--text-muted)' }}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'account' ? (
            <>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="название счёта..."
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <CurrencySelect value={newCurrency} onChange={setNewCurrency} style={{ flex: 1 }} />
                <input type="text" inputMode="decimal" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="начальный баланс"
                  style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
              </div>
              <button onClick={handleAddAccount} disabled={saving || !newName.trim()} style={{ width: '100%', background: '#b0976725', border: '1px solid #b0976770', color: '#b09767', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? '...' : 'ДОБАВИТЬ СЧЁТ'}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <select value={fromId} onChange={e => setFromId(e.target.value)} style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}>
                  <option value="">Откуда</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>→</span>
                <select value={toId} onChange={e => setToId(e.target.value)} style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}>
                  <option value="">Куда</option>
                  {accounts.filter(a => a.id !== fromId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input type="text" inputMode="decimal" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="списать"
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                <input type="text" inputMode="decimal" value={toAmount} onChange={e => setToAmount(e.target.value)} placeholder="зачислить"
                  style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
              </div>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="заметка..."
                style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
              <button onClick={handleTransfer} disabled={saving} style={{ width: '100%', background: '#b0976725', border: '1px solid #b0976770', color: '#b09767', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? '...' : 'ЗАПИСАТЬ ПЕРЕВОД'}
              </button>
            </>
          )}
      </div>

      {transfers.map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#b09767', flexShrink: 0 }} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tx.note || 'перевод'} · {tx.date}</div></div>
          <div style={{ fontSize: 11, color: '#b09767' }}>{Number(tx.amount).toLocaleString('ru-RU')} {SYM[tx.currency] || tx.currency}</div>
        </div>
      ))}
    </>
  )
}

function DebtsForm({ gremlinId, debts, onAdd, onSettle, onDelete }) {
  const [direction, setDirection] = useState('gave')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const active = debts.filter(d => d.status === 'active')
  const settled = debts.filter(d => d.status === 'settled')

  const handleSave = async () => {
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || !person.trim()) return
    setSaving(true)
    try {
      const result = await addDebt(gremlinId, { direction, person: person.trim(), amount: num, currency, note: note.trim() || null })
      onAdd(result)
      setPerson(''); setAmount(''); setNote(''); setFormOpen(false)
    } catch {}
    setSaving(false)
  }

  const dirColor = direction === 'gave' ? '#849cff' : '#da934c'

  return (
    <>
      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
          {[['gave', '→ дал', '#849cff'], ['took', '← взял', '#da934c']].map(([id, label, col]) => (
            <button key={id} onClick={() => setDirection(id)} style={{ flex: 1, padding: '8px', borderRadius: 7, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: direction === id ? col + '25' : 'var(--bg2)', border: '1px solid ' + (direction === id ? col + '70' : 'var(--border)'), color: direction === id ? col : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
        <input value={person} onChange={e => setPerson(e.target.value)} placeholder={direction === 'gave' ? 'кому...' : 'от кого...'}
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="сумма"
            style={{ flex: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 9px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
          <CurrencySelect value={currency} onChange={setCurrency} style={{ flex: 1 }} />
        </div>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="заметка..."
          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }} />
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: dirColor + '25', border: '1px solid ' + dirColor + '70', color: dirColor, borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {saving ? '...' : 'ЗАПИСАТЬ'}
        </button>
      </div>

      {active.length > 0 && <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: '0.06em' }}>АКТИВНЫЕ</div>}
      {active.map(d => (
        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: d.direction === 'gave' ? '#849cff' : '#da934c', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text)' }}>{d.direction === 'gave' ? 'дал ' : 'взял у '}{d.person}</div>
            {d.note && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.note}</div>}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: d.direction === 'gave' ? '#849cff' : '#da934c', whiteSpace: 'nowrap' }}>
            {Number(d.amount).toLocaleString('ru-RU')} {SYM[d.currency] || d.currency}
          </div>
          <button onClick={() => onSettle(d.id)} style={{ background: '#68b28120', border: '1px solid #68b28140', color: '#68b281', borderRadius: 5, padding: '3px 7px', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>вернул</button>
          <button onClick={() => onDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px' }}>✕</button>
        </div>
      ))}

      {settled.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', margin: '8px 0 5px', letterSpacing: '0.06em' }}>ЗАКРЫТЫЕ</div>
          {settled.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 7, padding: '7px 10px', marginBottom: 4, opacity: 0.5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{d.direction === 'gave' ? 'дал ' : 'взял у '}{d.person}</div>
              </div>
              <div style={{ fontSize: 11, color: '#555' }}>{Number(d.amount).toLocaleString('ru-RU')} {SYM[d.currency] || d.currency}</div>
              <button onClick={() => onDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 13, padding: '0 2px' }}>✕</button>
            </div>
          ))}
        </>
      )}
    </>
  )
}
