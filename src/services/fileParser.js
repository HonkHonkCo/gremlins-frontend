// Финансовый парсер с правильной обработкой форматов чисел
// Ключевая особенность: точка может быть разделителем тысяч (IDR, RUB формат)

const INCOME_RE = /получил|пришли|пришло|приход|зарплата|поступили|дала|вернул[аи]?|пополнение|прислал[аи]?/i
const SKIP_RE = /с\s+псб.*(?:сбер|кредитку|тбанк)|перевёл.*(?:на\s+сбер|псб|тбанк)|покупка\s+билета|оплата\s+ипотеки|снял.*(?:usdt|со\s+счет)|вывел.*(?:usdt|рп\s+юре|в\s+qris|с\s+usdt)|принял.*usdt|вывод.*usdt|обменял|конвертир|отправил.*(?:юре|юле|инне|кате)|перевел.*(?:юре|инне)|скинул.*usdt/i
const LEFTOVER_RE = /с\s+\d+\s*\$/i
const BALANCE_RE = /^(?:баланс|остаток|наличка)\s*[-:]/i

// Парсим число с учётом того что точка может быть разделителем тысяч
// "300.000" → 300000, "3.15" → 3.15, "1.000.000" → 1000000
function parseNumber(str) {
  if (!str) return null
  const s = str.trim()
  // Если несколько точек — все точки это разделители тысяч
  const dots = (s.match(/\./g) || []).length
  const commas = (s.match(/,/g) || []).length
  
  if (dots >= 2) {
    // "1.000.000" → убираем все точки
    return parseFloat(s.replace(/\./g, ''))
  }
  if (dots === 1 && commas === 0) {
    // "300.000" — смотрим сколько цифр после точки
    const afterDot = s.split('.')[1]
    if (afterDot && afterDot.length === 3) {
      // "300.000" → 300000 (разделитель тысяч)
      return parseFloat(s.replace(/\./g, ''))
    }
    // "3.15" → 3.15 (десятичная)
    return parseFloat(s)
  }
  if (commas === 1 && dots === 0) {
    // "3,15" → 3.15
    return parseFloat(s.replace(',', '.'))
  }
  return parseFloat(s.replace(/[.,\s]/g, '').replace(/^0+/, '') || '0')
}

function extractAmounts(line) {
  // Числа: целые, с точками-разделителями, с запятой-десятичной
  // "300.000", "1.000.000", "3.15", "5 000"
  return line.match(/\d[\d\s.]*\d|\d/g) || []
}

export function scanFile(text) {
  const lines = text.split('\n')
  const totals = {} // ISO → { expense, income }

  for (const line of lines) {
    const clean = line.trim()
    if (!clean || clean.length < 3) continue
    if (SKIP_RE.test(clean)) continue
    if (LEFTOVER_RE.test(clean)) continue
    if (BALANCE_RE.test(clean)) continue

    const isIncome = INCOME_RE.test(clean)

    // --- IDR: "300.000 рп", "1 млн рп", "5.000.000 рп" ---
    // Сначала млн рп
    const mlnRp = clean.match(/(\d+(?:[.,]\d+)?)\s*млн\s*рп/gi) || []
    for (const m of mlnRp) {
      const num = parseNumber(m.match(/[\d.,]+/)[0]) * 1000000
      if (num > 0 && num < 100000000000) {
        addTo(totals, 'IDR', isIncome ? 'income' : 'expense', num)
      }
    }

    // Обычные рп (пропускаем если уже нашли млн в этой строке)
    if (mlnRp.length === 0) {
      const rpMatches = clean.match(/(\d[\d.\s]*\d|\d)\s*рп\b/gi) || []
      for (const m of rpMatches) {
        const numStr = m.replace(/рп/gi, '').trim()
        const num = parseNumber(numStr)
        if (num && num > 0 && num < 100000000) {
          addTo(totals, 'IDR', isIncome ? 'income' : 'expense', num)
        }
      }
    }

    // --- RUB: "520 руб", "30.000 руб", "5000 р", "47.150 руб" ---
    // Только если нет рп в строке (чтобы не путать)
    if (!clean.match(/рп\b/i)) {
      // тыс руб
      const tysRub = clean.match(/(\d+(?:[.,]\d+)?)\s*тыс\.?\s*руб/gi) || []
      for (const m of tysRub) {
        const num = parseNumber(m.match(/[\d.,]+/)[0]) * 1000
        if (num > 0) addTo(totals, 'RUB', isIncome ? 'income' : 'expense', num)
      }

      if (tysRub.length === 0) {
        const rubMatches = clean.match(/(\d[\d.\s]*\d|\d)\s*(?:руб(?:лей|ля)?\b|рублей|₽|р\b)/gi) || []
        for (const m of rubMatches) {
          const numStr = m.replace(/руб(?:лей|ля)?|рублей|₽|р\b/gi, '').trim()
          const num = parseNumber(numStr)
          if (num && num > 100 && num < 10000000) { // минимум 100 руб чтобы не ловить мусор
            addTo(totals, 'RUB', isIncome ? 'income' : 'expense', num)
          }
        }
      }
    }

    // --- USD: "3.15$", "$50", "100 usd", "50 долл" ---
    const usdMatches1 = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:\$|usd|долл)/gi) || []
    const usdMatches2 = clean.match(/\$\s*(\d+(?:[.,]\d+)?)/g) || []
    for (const m of [...usdMatches1, ...usdMatches2]) {
      const numStr = m.replace(/[$usdдолл]/gi, '').trim()
      const num = parseNumber(numStr)
      if (num && num > 0 && num < 100000) {
        addTo(totals, 'USD', isIncome ? 'income' : 'expense', num)
      }
    }

    // --- THB: "85 бат", "16500 бат", "฿200" ---
    // Только если явно указано слово "бат" или символ ฿
    const thbMatches = clean.match(/(\d[\d\s]*)\s*бат\b/gi) || []
    const thbMatches2 = clean.match(/฿\s*(\d+)/g) || []
    for (const m of [...thbMatches, ...thbMatches2]) {
      const numStr = m.replace(/бат|฿/gi, '').trim()
      const num = parseNumber(numStr)
      if (num && num > 0 && num < 500000) {
        addTo(totals, 'THB', isIncome ? 'income' : 'expense', num)
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

function addTo(totals, iso, type, amount) {
  if (!totals[iso]) totals[iso] = { expense: 0, income: 0 }
  totals[iso][type] += amount
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
  const opCount = lines.filter(l => /рп\b|руб\b|бат\b|\$|฿/i.test(l)).length

  return { totals, opCount, totalLines: lines.length }
}

export function formatSummary(totals) {
  const SYMBOLS = { RUB: '₽', USD: '$', THB: '฿', IDR: 'Rp', EUR: '€', GBP: '£' }
  const lines = []
  for (const [iso, t] of Object.entries(totals)) {
    const sym = SYMBOLS[iso] || iso
    const bal = (t.income || 0) - (t.expense || 0)
    if (t.expense > 0) lines.push('Расходы ' + sym + ': ' + t.expense.toLocaleString('ru-RU'))
    if (t.income > 0) lines.push('Доходы ' + sym + ': ' + t.income.toLocaleString('ru-RU'))
    lines.push('Баланс ' + sym + ': ' + (bal >= 0 ? '+' : '') + bal.toLocaleString('ru-RU'))
  }
  return lines.join('\n')
}

export function totalsToParsed(totals) {
  const result = {}
  for (const [iso, t] of Object.entries(totals)) {
    const isoLow = iso.toLowerCase()
    if (t.expense > 0) result['expense_' + isoLow] = t.expense
    if (t.income > 0) result['income_' + isoLow] = t.income
  }
  return result
}
