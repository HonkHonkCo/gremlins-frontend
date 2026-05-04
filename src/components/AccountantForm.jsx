import { useState, useEffect } from 'react'
import { addTransaction, getTransactions, deleteTransaction } from '../services/api'

// Популярные валюты — показываем сразу
const POPULAR_CURRENCIES = [
  { code: 'THB', symbol: '฿' }, { code: 'USD', symbol: '$' },
  { code: 'RUB', symbol: '₽' }, { code: 'IDR', symbol: 'Rp' },
  { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
]

// Все валюты — для поиска
const ALL_CURRENCIES = [
  { code: 'THB', symbol: '฿', name: 'Тайский бат' },
  { code: 'USD', symbol: '$', name: 'Доллар США' },
  { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
  { code: 'IDR', symbol: 'Rp', name: 'Индонезийская рупия' },
  { code: 'EUR', symbol: '€', name: 'Евро' },
  { code: 'GBP', symbol: '£', name: 'Фунт стерлингов' },
  { code: 'AUD', symbol: 'A$', name: 'Австралийский доллар' },
  { code: 'JPY', symbol: '¥', name: 'Японская иена' },
  { code: 'CNY', symbol: '¥', name: 'Китайский юань' },
  { code: 'KRW', symbol: '₩', name: 'Корейская вона' },
  { code: 'SGD', symbol: 'S$', name: 'Сингапурский доллар' },
  { code: 'MYR', symbol: 'RM', name: 'Малайзийский ринггит' },
  { code: 'VND', symbol: '₫', name: 'Вьетнамский донг' },
  { code: 'TRY', symbol: '₺', name: 'Турецкая лира' },
  { code: 'AED', symbol: 'د.إ', name: 'Дирхам ОАЭ' },
  { code: 'CAD', symbol: 'C$', name: 'Канадский доллар' },
  { code: 'CHF', symbol: 'Fr', name: 'Швейцарский франк' },
  { code: 'PLN', symbol: 'zł', name: 'Польский злотый' },
  { code: 'CZK', symbol: 'Kč', name: 'Чешская крона' },
  { code: 'GEL', symbol: '₾', name: 'Грузинский лари' },
  { code: 'AMD', symbol: '֏', name: 'Армянский драм' },
  { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
  { code: 'UZS', symbol: "so'm", name: 'Узбекский сум' },
  { code: 'UAH', symbol: '₴', name: 'Украинская гривна' },
  { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' },
  { code: 'HUF', symbol: 'Ft', name: 'Венгерский форинт' },
  { code: 'RON', symbol: 'lei', name: 'Румынский лей' },
  { code: 'BGN', symbol: 'лв', name: 'Болгарский лев' },
  { code: 'INR', symbol: '₹', name: 'Индийская рупия' },
  { code: 'BTC', symbol: '₿', name: 'Биткоин' },
  { code: 'USDT', symbol: '₮', name: 'Tether USDT' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum' },
]

const SYMBOL = Object.fromEntries(ALL_CURRENCIES.map(c => [c.code, c.symbol]))

const EXPENSE_CATS = [
  { id: 'еда', label: '🛒 еда' },
  { id: 'кафе', label: '☕ кафе' },
  { id: 'транспорт', label: '🚕 транспорт' },
  { id: 'жильё', label: '🏠 жильё' },
  { id: 'здоровье', label: '💊 здоровье' },
  { id: 'одежда', label: '👕 одежда' },
  { id: 'развлечения', label: '🎮 развлечения' },
  { id: 'связь', label: '📱 связь' },
  { id: 'другое', label: '+ другое' },
]

const TYPES = [
  { id: 'expense', label: '↓ Расход', color: '#e24b4a' },
  { id: 'income', label: '↑ Доход', color: '#3ecf70' },
  { id: 'investment', label: '📈 Вклад', color: '#4a9eff' },
  { id: 'transfer', label: '⇄ Перевод', color: '#888' },
]

const DOT = { expense: '#e24b4a', income: '#3ecf70', investment: '#4a9eff', transfer: '#888' }

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

export default function AccountantForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('THB')
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)
  const [currencySearch, setCurrencySearch] = useState('')
  const [customCurrency, setCustomCurrency] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('еда')
  const [customCat, setCustomCat] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  // Поля для вклада
  const [rate, setRate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadTx() }, [gremlinId])

  const loadTx = async () => {
    try {
      const data = await getTransactions(gremlinId)
      setTransactions(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const finalCurrency = currency === '__custom__' ? customCurrency.trim().toUpperCase() || 'OTHER' : currency

  const handleSave = async () => {
    setError(null)
    const num = parseFloat(String(amount).replace(',', '.'))
    if (!num || num <= 0 || isNaN(num)) {
      setError(lang === 'ru' ? 'Введи сумму' : 'Enter amount'); return
    }
    if (currency === '__custom__' && !customCurrency.trim()) {
      setError(lang === 'ru' ? 'Укажи валюту' : 'Enter currency'); return
    }
    setSaving(true)
    try {
      const cat = type === 'expense' ? (category === 'другое' ? (customCat.trim() || 'другое') : category) : null
      const extra = type === 'investment' ? {
        rate: rate ? parseFloat(rate) : null,
        end_date: endDate || null,
      } : {}
      const result = await addTransaction(gremlinId, {
        amount: num, currency: finalCurrency, type,
        category: cat, note: note.trim() || null,
        date, ...extra,
      })
      if (result?.transaction) setTransactions(t => [result.transaction, ...t])
      if (result?.stats) onStatsUpdate(result.stats)
      setAmount(''); setNote(''); setCustomCat(''); setRate(''); setEndDate('')
      setDate(todayStr())
    } catch (e) {
      console.error(e)
      setError(lang === 'ru' ? 'Ошибка сохранения' : 'Save error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteTransaction(id, gremlinId)
      setTransactions(t => t.filter(tx => tx.id !== id))
      if (result?.stats) onStatsUpdate(result.stats)
    } catch (e) { console.error(e) }
  }

  const filtered = currencySearch.trim()
    ? ALL_CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
        c.name.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : ALL_CURRENCIES

  const curSymbol = SYMBOL[finalCurrency] || finalCurrency

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Сумма + Валюта */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>СУММА</div>
          <input
            type="text" inputMode="decimal"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="0"
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 20, fontWeight: 700, outline: 'none' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ВАЛЮТА</div>
          <button
            onClick={() => setShowCurrencyPicker(v => !v)}
            style={{ width: '100%', height: 46, background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, color: accentColor, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            {curSymbol} {finalCurrency}
          </button>
        </div>
      </div>

      {/* Пикер валюты */}
      {showCurrencyPicker && (
        <div style={{ background: 'var(--bg2)', border: '1px solid ' + accentColor + '30', borderRadius: 10, padding: 10 }}>
          {/* Популярные */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {POPULAR_CURRENCIES.map(c => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); setCurrencySearch('') }}
                style={{ padding: '5px 10px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: currency === c.code ? accentColor + '30' : 'var(--bg3)', border: '1px solid ' + (currency === c.code ? accentColor : 'var(--border)'), color: currency === c.code ? accentColor : 'var(--text-dim)' }}>
                {c.symbol} {c.code}
              </button>
            ))}
          </div>
          {/* Поиск */}
          <input autoFocus value={currencySearch} onChange={e => setCurrencySearch(e.target.value)}
            placeholder="Поиск по коду или названию..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none', marginBottom: 6 }}
          />
          {/* Результаты поиска */}
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.map(c => (
              <button key={c.code} onClick={() => { setCurrency(c.code); setShowCurrencyPicker(false); setCurrencySearch('') }}
                style={{ padding: '6px 10px', borderRadius: 6, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', textAlign: 'left', background: currency === c.code ? accentColor + '20' : 'transparent', border: '1px solid ' + (currency === c.code ? accentColor + '50' : 'transparent'), color: 'var(--text-dim)' }}>
                <span style={{ color: accentColor, marginRight: 6 }}>{c.symbol} {c.code}</span>{c.name}
              </button>
            ))}
          </div>
          {/* Своя валюта */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>СВОЯ ВАЛЮТА (ISO код)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={customCurrency} onChange={e => setCustomCurrency(e.target.value.toUpperCase().slice(0,5))}
                placeholder="напр. ARS"
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
              />
              <button onClick={() => { setCurrency('__custom__'); setShowCurrencyPicker(false); setCurrencySearch('') }}
                style={{ background: accentColor, color: '#000', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Тип */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {TYPES.map(tp => (
          <button key={tp.id} onClick={() => setType(tp.id)} style={{ padding: '9px 4px', borderRadius: 8, fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: type === tp.id ? tp.color + '20' : 'var(--bg3)', border: '1px solid ' + (type === tp.id ? tp.color + '80' : 'var(--border)'), color: type === tp.id ? tp.color : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {tp.label}
          </button>
        ))}
      </div>

      {/* Категория расходов */}
      {type === 'expense' && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>КАТЕГОРИЯ</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {EXPENSE_CATS.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)} style={{ padding: '5px 10px', borderRadius: 20, fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', background: category === cat.id ? accentColor + '20' : 'var(--bg3)', border: '1px solid ' + (category === cat.id ? accentColor + '60' : 'var(--border)'), color: category === cat.id ? accentColor : 'var(--text-muted)' }}>
                {cat.label}
              </button>
            ))}
          </div>
          {category === 'другое' && (
            <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="своя категория..."
              style={{ marginTop: 6, width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
            />
          )}
        </div>
      )}

      {/* Поля вклада */}
      {type === 'investment' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>% ГОДОВЫХ</div>
            <input type="text" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} placeholder="12.5"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid #4a9eff40', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>ДО ДАТЫ</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid #4a9eff40', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Заметка + Дата */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Заметка..."
          style={{ flex: 2, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 10px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, background: 'var(--bg3)', border: '1px solid ' + accentColor + '20', borderRadius: 8, padding: '9px 8px', color: 'var(--text)', fontFamily: 'inherit', fontSize: 11, outline: 'none' }}
        />
      </div>

      {error && <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving}
        style={{ background: amount ? accentColor : 'var(--bg3)', color: amount ? '#000' : 'var(--text-muted)', border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
        {saving ? '...' : 'ЗАПИСАТЬ'}
      </button>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, letterSpacing: '0.06em' }}>ПОСЛЕДНИЕ ЗАПИСИ</div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
      ) : transactions.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>Пока нет записей</div>
      ) : transactions.slice(0, 50).map(tx => (
        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: DOT[tx.type] || '#888' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tx.category || tx.type}
              {tx.rate ? <span style={{ color: '#4a9eff', fontSize: 10, marginLeft: 4 }}>{tx.rate}%</span> : null}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
              {tx.note && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{tx.note}</span>}
              {tx.date && <span>{tx.date}</span>}
              {tx.end_date && <span>→ {tx.end_date}</span>}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: DOT[tx.type] || '#888' }}>
            {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '→'}
            {Number(tx.amount).toLocaleString('ru-RU')} {SYMBOL[tx.currency] || tx.currency}
          </div>
          <button onClick={() => handleDelete(tx.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}>✕</button>
        </div>
      ))}
    </div>
  )
}
