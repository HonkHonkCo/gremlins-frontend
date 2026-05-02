// Двухэтапный парсер финансовых записей
// Шаг 1: программа сканирует и нормализует валюты сразу
// Шаг 2: AI видит только готовые итоги (~5 строк) и пишет комментарий

// Карта нормализации — все варианты написания → ISO код
const CURRENCY_MAP = {
  // USD
  '$': 'USD', 'usd': 'USD', 'долл': 'USD', 'dollar': 'USD', 'dollars': 'USD',
  // RUB
  '₽': 'RUB', 'руб': 'RUB', 'рублей': 'RUB', 'рубля': 'RUB', 'rub': 'RUB',
  'р': 'RUB', // только как отдельное слово
  // THB
  '฿': 'THB', 'бат': 'THB', 'baht': 'THB', 'thb': 'THB', 'батов': 'THB',
  // IDR
  'rp': 'IDR', 'рп': 'IDR', 'idr': 'IDR', 'рупий': 'IDR', 'рупий': 'IDR',
  'rupiah': 'IDR', 'rupiah': 'IDR',
  // EUR
  '€': 'EUR', 'eur': 'EUR', 'евро': 'EUR',
  // GBP
  '£': 'GBP', 'gbp': 'GBP', 'фунт': 'GBP', 'фунтов': 'GBP',
  // AUD
  'aud': 'AUD', 'австр': 'AUD',
  // JPY
  'jpy': 'JPY', '¥': 'JPY', 'йен': 'JPY',
  // MYR
  'myr': 'MYR', 'rm': 'MYR', 'ринггит': 'MYR',
}

const INCOME_RE = /получил|зарплата|пришло|приход|доход|\+\s*\d|прибыль|заработал|выручка/i
const SKIP_RE = /с\s+псб|на\s+сбер|меж.*счет|перевод.*счет|снял.*счет|переложил|конвертир/i
const LEFTOVER_RE = /с\s+\d+\s*[$฿€£]/i  // "с 50$" — остаток купюры

function normalizeCurrency(raw) {
  if (!raw) return null
  const key = raw.toLowerCase().trim().replace(/\./g, '')
  return CURRENCY_MAP[key] || null
}

function cleanAmount(str) {
  return parseFloat(str.replace(/\s/g, '').replace(',', '.'))
}

export function scanFile(text) {
  const lines = text.split('\n')
  // ISO → { expense, income }
  const totals = {}

  for (const line of lines) {
    const clean = line.trim()
    if (!clean) continue
    if (SKIP_RE.test(clean)) continue
    if (LEFTOVER_RE.test(clean)) continue

    const isIncome = INCOME_RE.test(clean)

    // Паттерн 1: число ПЕРЕД валютой: "3.15$", "500 бат", "3400руб", "45000рп"
    const re1 = /(\d[\d\s]*(?:[.,]\d+)?)\s*(rp|рп|idr|рупий|\$|usd|долл|dollar|฿|бат|baht|thb|батов|руб|рублей|рубля|р\b|₽|rub|€|eur|евро|£|gbp|фунт|aud|австр|jpy|¥|йен|myr|rm|ринггит)/gi
    let m
    let found = false
    while ((m = re1.exec(clean)) !== null) {
      const amount = cleanAmount(m[1])
      const iso = normalizeCurrency(m[2])
      if (!amount || amount <= 0 || amount > 50000000 || !iso) continue
      if (!totals[iso]) totals[iso] = { expense: 0, income: 0 }
      if (isIncome) totals[iso].income += amount
      else totals[iso].expense += amount
      found = true
    }

    // Паттерн 2: валюта ПЕРЕД числом: "$3.15", "₽500", "€20"
    if (!found) {
      const re2 = /(\$|₽|€|£|฿|¥)\s*(\d[\d\s]*(?:[.,]\d+)?)/g
      while ((m = re2.exec(clean)) !== null) {
        const amount = cleanAmount(m[2])
        const iso = normalizeCurrency(m[1])
        if (!amount || amount <= 0 || amount > 50000000 || !iso) continue
        if (!totals[iso]) totals[iso] = { expense: 0, income: 0 }
        if (isIncome) totals[iso].income += amount
        else totals[iso].expense += amount
      }
    }
  }

  // Округляем
  for (const t of Object.values(totals)) {
    t.expense = Math.round(t.expense * 100) / 100
    t.income = Math.round(t.income * 100) / 100
  }

  return totals
}

export function parseTelegramExport(json) {
  const lines = json.messages
    .filter(m => m.type === 'message' && m.text)
    .map(m => {
      if (typeof m.text === 'string') return m.text
      if (Array.isArray(m.text)) return m.text.map(t => typeof t === 'string' ? t : (t.text || '')).join('')
      return ''
    })

  const totals = scanFile(lines.join('\n'))
  const opCount = lines.filter(l => /\d/.test(l) && /[$฿€£₽¥]|usd|thb|rub|idr|eur|руб|бат|рп|долл/i.test(l)).length

  return { totals, opCount, totalLines: lines.length }
}

export function formatSummary(totals) {
  const lines = []
  for (const [iso, t] of Object.entries(totals)) {
    if (t.expense > 0) lines.push('Расходы ' + iso + ': ' + t.expense.toLocaleString('ru-RU'))
    if (t.income > 0) lines.push('Доходы ' + iso + ': ' + t.income.toLocaleString('ru-RU'))
    const bal = (t.income || 0) - (t.expense || 0)
    lines.push('Баланс ' + iso + ': ' + (bal >= 0 ? '+' : '') + bal.toLocaleString('ru-RU'))
  }
  return lines.join('\n')
}

// Конвертируем totals в parsedTotals для entries.js
export function totalsToParsed(totals) {
  const result = {}
  for (const [iso, t] of Object.entries(totals)) {
    const isoLow = iso.toLowerCase()
    if (t.expense > 0) result['expense_' + isoLow] = t.expense
    if (t.income > 0) result['income_' + isoLow] = t.income
  }
  return result
}
