import { useState, useEffect } from 'react'
import { addTransaction, getTransactions, deleteTransaction } from '../services/api'

const CURRENCIES = ['THB', 'USD', 'RUB', 'IDR', 'EUR', 'GBP', 'AUD']
const CURRENCY_SYMBOLS = { THB: '฿', USD: '$', RUB: '₽', IDR: 'Rp', EUR: '€', GBP: '£', AUD: 'A$' }

const EXPENSE_CATS = [
  { id: 'еда', label: '🛒 еда' },
  { id: 'кафе', label: '☕ кафе' },
  { id: 'транспорт', label: '🚕 транспорт' },
  { id: 'жильё', label: '🏠 жильё' },
  { id: 'здоровье', label: '💊 здоровье' },
  { id: 'одежда', label: '👕 одежда' },
  { id: 'развлечения', label: '🎮 развлечения' },
  { id: 'другое', label: '+ другое' },
]

const TYPES = [
  { id: 'expense', label: '↓ Расход', color: '#e24b4a' },
  { id: 'income', label: '↑ Доход', color: '#3ecf70' },
  { id: 'investment', label: '📈 Вклад', color: '#4a9eff' },
  { id: 'transfer', label: '⇄ Перевод', color: '#888' },
]

export default function AccountantForm({ gremlinId, accentColor, lang, onStatsUpdate }) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('THB')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('еда')
  const [customCat, setCustomCat] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTransactions()
  }, [gremlinId])

  const loadTransactions = async () => {
    try {
      const data = await getTransactions(gremlinId)
      setTransactions(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  const handleSave = async () => {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) return
    if (type === 'transfer') { setAmount(''); return } // переводы не учитываем в stats
    setSaving(true)
    try {
      const cat = category === 'другое' ? (customCat.trim() || 'другое') : category
      const result = await addTransaction(gremlinId, {
        amount: num,
        currency,
        type,
        category: type === 'expense' ? cat : null,
        note: note.trim() || null,
      })
      setTransactions(t => [result.transaction, ...t])
      if (result.stats) onStatsUpdate(result.stats)
      setAmount('')
      setNote('')
      setCustomCat('')
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      const result = await deleteTransaction(id, gremlinId)
      setTransactions(t => t.filter(tx => tx.id !== id))
      if (result.stats) onStatsUpdate(result.stats)
    } catch {}
  }

  const DOT_COLORS = { expense: '#e24b4a', income: '#3ecf70', investment: '#4a9eff', transfer: '#888' }

  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Сумма + Валюта */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
            {lang === 'ru' ? 'СУММА' : 'AMOUNT'}
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg3)', border: '1px solid ' + accentColor + '40',
              borderRadius: 8, padding: '10px 12px',
              color: 'var(--text)', fontFamily: 'inherit', fontSize: 20,
              fontWeight: 700, outline: 'none'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
            {lang === 'ru' ? 'ВАЛЮТА' : 'CURRENCY'}
          </div>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid ' + accentColor + '40',
              borderRadius: 8, padding: '10px 8px', color: accentColor,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, outline: 'none',
              cursor: 'pointer', height: 46
            }}
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{CURRENCY_SYMBOLS[c] || c} {c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Тип */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
          {lang === 'ru' ? 'ТИП' : 'TYPE'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {TYPES.map(tp => (
            <button
              key={tp.id}
              onClick={() => setType(tp.id)}
              style={{
                padding: '9px 4px', borderRadius: 8, fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                background: type === tp.id ? tp.color + '20' : 'var(--bg3)',
                border: '1px solid ' + (type === tp.id ? tp.color + '80' : 'var(--border)'),
                color: type === tp.id ? tp.color : 'var(--text-muted)',
                transition: 'all 0.15s'
              }}
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Категория — только для расходов */}
      {type === 'expense' && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
            {lang === 'ru' ? 'КАТЕГОРИЯ' : 'CATEGORY'}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {EXPENSE_CATS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: '5px 10px', borderRadius: 20, fontFamily: 'inherit',
                  fontSize: 11, cursor: 'pointer',
                  background: category === cat.id ? accentColor + '20' : 'var(--bg3)',
                  border: '1px solid ' + (category === cat.id ? accentColor + '60' : 'var(--border)'),
                  color: category === cat.id ? accentColor : 'var(--text-muted)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {category === 'другое' && (
            <input
              value={customCat}
              onChange={e => setCustomCat(e.target.value)}
              placeholder={lang === 'ru' ? 'своя категория...' : 'custom category...'}
              style={{
                marginTop: 6, width: '100%', boxSizing: 'border-box',
                background: 'var(--bg3)', border: '1px solid ' + accentColor + '40',
                borderRadius: 8, padding: '7px 10px', color: 'var(--text)',
                fontFamily: 'inherit', fontSize: 12, outline: 'none'
              }}
            />
          )}
        </div>
      )}

      {/* Заметка */}
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
          {lang === 'ru' ? 'ЗАМЕТКА' : 'NOTE'}
        </div>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={lang === 'ru' ? 'необязательно...' : 'optional...'}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg3)', border: '1px solid ' + accentColor + '40',
            borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
            fontFamily: 'inherit', fontSize: 13, outline: 'none'
          }}
        />
      </div>

      {/* Кнопка */}
      <button
        onClick={handleSave}
        disabled={!amount || saving}
        style={{
          background: amount ? accentColor : 'var(--bg3)',
          color: amount ? '#000' : 'var(--text-muted)',
          border: 'none', borderRadius: 10, padding: '13px',
          fontSize: 13, fontWeight: 700, cursor: amount ? 'pointer' : 'default',
          fontFamily: 'inherit', transition: 'all 0.15s'
        }}
      >
        {saving ? '...' : (lang === 'ru' ? 'ЗАПИСАТЬ' : 'SAVE')}
      </button>

      {/* Список транзакций */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.06em' }}>
        {lang === 'ru' ? 'ПОСЛЕДНИЕ ЗАПИСИ' : 'RECENT'}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>...</div>
      ) : transactions.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 12 }}>
          {lang === 'ru' ? 'Пока нет записей' : 'No records yet'}
        </div>
      ) : (
        transactions.slice(0, 30).map(tx => (
          <div key={tx.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg2)', borderRadius: 8, padding: '9px 12px'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: DOT_COLORS[tx.type] || '#888' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.category || tx.type}
              </div>
              {tx.note && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.note}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              color: tx.type === 'expense' ? '#e24b4a' : tx.type === 'income' ? '#3ecf70' : tx.type === 'investment' ? '#4a9eff' : '#888'
            }}>
              {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '→'}
              {Number(tx.amount).toLocaleString('ru-RU')} {CURRENCY_SYMBOLS[tx.currency] || tx.currency}
            </div>
            <button
              onClick={() => handleDelete(tx.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, padding: '0 2px', fontFamily: 'inherit' }}
            >✕</button>
          </div>
        ))
      )}
    </div>
  )
}
