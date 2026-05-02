// Двухэтапный парсер:
// 1. Программа сканирует числа и группирует по меткам валют
// 2. AI определяет ISO код и тип (доход/расход) по минимальному контексту

// Паттерны для захвата числа + метки валюты
// Порядок важен — более специфичные раньше
const AMOUNT_PATTERNS = [
  // Число ПЕРЕД меткой: 3.15$, 500 бат, 3400р, 45000рп
  /(\d[\d\s]*(?:[.,]\d+)?)\s*(rp|рп|idr|\$|usd|долл|dollar|฿|бат|baht|thb|руб|рублей|р\b|₽|rub|€|евро|eur|£|фунт|gbp|aud|австр|jpy|йен)/gi,
  // Метка ПЕРЕД числом: $3.15, ₽500, €20
  /(\$|₽|€|£|฿)\s*(\d[\d\s]*(?:[.,]\d+)?)/g,
]

// Ключевые слова для определения типа
const INCOME_RE = /получил|зарплата|пришло|приход|доход|\+\s*\d|прибыль|выручка|заработал/i
const SKIP_RE = /с\s+псб|на\s+сбер|на\s+счет|со\s+счета|перевод\s+между|снял\s+с\s+.*счет|переложил/i
const IGNORE_CONTEXT = /с\s+\d+\s*\$/i  // "с 50$" — остаток купюры

function cleanAmount(str) {
  return parseFloat(str.replace(/\s/g, '').replace(',', '.'))
}

function normalizeLabelKey(label) {
  // Приводим к нижнему регистру для группировки
  return label.toLowerCase().trim()
}

export function scanFile(text) {
  const lines = text.split('\n')
  // label → { expense: 0, income: 0, samples: [] }
  const groups = {}

  for (const line of lines) {
    const clean = line.trim()
    if (!clean) continue
    if (SKIP_RE.test(clean)) continue
    if (IGNORE_CONTEXT.test(clean)) continue

    const isIncome = INCOME_RE.test(clean)

    // Паттерн 1: число перед меткой
    const re1 = /(\d[\d\s]*(?:[.,]\d+)?)\s*(rp|рп|idr|\$|usd|долл|dollar|฿|бат|baht|thb|руб|рублей|р\b|₽|rub|€|евро|eur|£|фунт|gbp|aud|австр|jpy|йен)/gi
    let m
    while ((m = re1.exec(clean)) !== null) {
      const amount = cleanAmount(m[1])
      if (!amount || amount <= 0 || amount > 100000000) continue
      const label = normalizeLabelKey(m[2])
      if (!groups[label]) groups[label] = { expense: 0, income: 0, samples: [] }
      if (isIncome) groups[label].income += amount
      else groups[label].expense += amount
      if (groups[label].samples.length < 3) groups[label].samples.push(clean.slice(0, 60))
    }

    // Паттерн 2: символ перед числом ($3.15, ₽500)
    const re2 = /(\$|₽|€|£|฿)\s*(\d[\d\s]*(?:[.,]\d+)?)/g
    while ((m = re2.exec(clean)) !== null) {
      const amount = cleanAmount(m[2])
      if (!amount || amount <= 0 || amount > 100000000) continue
      const label = normalizeLabelKey(m[1])
      if (!groups[label]) groups[label] = { expense: 0, income: 0, samples: [] }
      if (isIncome) groups[label].income += amount
      else groups[label].expense += amount
      if (groups[label].samples.length < 3) groups[label].samples.push(clean.slice(0, 60))
    }
  }

  // Округляем
  for (const g of Object.values(groups)) {
    g.expense = Math.round(g.expense * 100) / 100
    g.income = Math.round(g.income * 100) / 100
  }

  return groups
}

export function parseTelegramExport(json) {
  const lines = json.messages
    .filter(m => m.type === 'message' && m.text)
    .map(m => {
      const txt = typeof m.text === 'string'
        ? m.text
        : Array.isArray(m.text)
          ? m.text.map(t => typeof t === 'string' ? t : (t.text || '')).join('')
          : ''
      return txt
    })

  const text = lines.join('\n')
  const groups = scanFile(text)

  // Считаем общее количество операций
  const opCount = lines.filter(l => {
    const re = /(\d[\d\s]*(?:[.,]\d+)?)\s*(rp|рп|idr|\$|usd|бат|баt|thb|руб|р\b|₽|€|£)/i
    return re.test(l)
  }).length

  return { groups, opCount, totalLines: lines.length }
}

export function formatGroupsForAI(groups) {
  // Компактная строка для AI: "рп: расход=45000 доход=0, $: расход=127.5 доход=50"
  return Object.entries(groups)
    .map(([label, g]) => {
      const parts = []
      if (g.expense > 0) parts.push('расход=' + g.expense.toLocaleString('ru-RU'))
      if (g.income > 0) parts.push('доход=' + g.income.toLocaleString('ru-RU'))
      return '"' + label + '": ' + parts.join(', ') + ' | примеры: ' + g.samples.slice(0,2).join(' / ')
    })
    .join('\n')
}
