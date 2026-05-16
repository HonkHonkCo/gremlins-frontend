import { useState } from 'react'
import { setTheme, isFairyTheme } from '../themes.js'

const INFO_STEPS = [
  {
    icon: '✦',
    titleRu: 'Добро пожаловать в Pocket Spirits',
    titleEn: 'Welcome to Pocket Spirits',
    textRu: 'Твои личные ИИ-духи, которые следят за жизнью и дают советы. Ты вводишь данные через форму — они анализируют, запоминают и иногда добавляют что-то от себя.',
    textEn: 'Your personal AI spirits that track your life and give advice. You enter data through the form — they analyze, remember, and sometimes add something on their own.',
  },
  {
    icon: '🧮',
    titleRu: 'Четыре духа — четыре сферы',
    titleEn: 'Four spirits — four areas',
    textRu: 'Бухгалтер: расходы, доходы, счета и долги.\nТренер: тренировки и активность.\nШеф: питание, КБЖУ и рецепты.\nСекретарь: задачи и дедлайны.\n\nКаждый видит данные остальных и учитывает общую картину.',
    textEn: 'Accountant: expenses, income, accounts and debts.\nTrainer: workouts and activity.\nChef: nutrition, macros and recipes.\nSecretary: tasks and deadlines.\n\nEach one sees the others\' data and considers the full picture.',
  },
  {
    icon: '💬',
    titleRu: 'Форма и чат',
    titleEn: 'Form and chat',
    textRu: 'Вводи данные через форму каждого духа — они сразу фиксируют и обновляют статистику.\n\nВ чате можно спросить совет, получить анализ или просто поговорить.',
    textEn: 'Enter data through each spirit\'s form — they instantly record and update your stats.\n\nUse the chat to ask for advice, get analysis, or just talk.',
  },
  {
    icon: '📊',
    titleRu: 'Еженедельный отчёт',
    titleEn: 'Weekly report',
    textRu: 'Каждый понедельник все духи собираются на совет и присылают общую сводку: цифры, факты, рекомендации.\n\nУведомление придёт прямо в Telegram.',
    textEn: 'Every Monday all spirits gather in council and send a general summary: numbers, facts, recommendations.\n\nA notification will arrive right in Telegram.',
  },
]

const WORLDS = [
  {
    id: 'default',
    icon: '⚙',
    nameRu: 'Мир Гремлинов',
    nameEn: 'Gremlins World',
    descRu: 'Стимпанк-механика\nхарактерные персонажи',
    descEn: 'Steampunk mechanics\ncharacter assistants',
    preview: '#f0b830',
    bg: '#1a1812',
  },
  {
    id: 'fairy_lilac',
    icon: '✦',
    nameRu: 'Мир Фей',
    nameEn: 'Fairies World',
    descRu: 'Лесная магия\nанимированные феи',
    descEn: 'Forest magic\nanimated fairies',
    preview: '#c97fd4',
    bg: '#0d0f1a',
  },
]

export default function Onboarding({ lang, onDone, isFirstTime = true }) {
  const [step, setStep] = useState(0)
  // Режимы: 'info' → 'world' (только firstTime) → done
  const [phase, setPhase] = useState('info')
  const [selectedWorld, setSelectedWorld] = useState('default')

  const isLastInfo = step === INFO_STEPS.length - 1
  const current = INFO_STEPS[step]

  const handleNext = () => {
    if (!isLastInfo) {
      setStep(s => s + 1)
    } else if (isFirstTime) {
      setPhase('world')
    } else {
      onDone()
    }
  }

  const handleWorldDone = () => {
    setTheme(selectedWorld)
    onDone(selectedWorld)
  }

  // ── Выбор мира ────────────────────────────────────────────────────────────
  if (phase === 'world') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', padding: '0 24px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 8 }}>
              {lang === 'ru' ? 'Выбери свой мир' : 'Choose your world'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {lang === 'ru' ? 'Можно сменить позже в Настройках' : 'You can change it later in Settings'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
            {WORLDS.map(w => (
              <button key={w.id} onClick={() => setSelectedWorld(w.id)} style={{
                background: selectedWorld === w.id ? `${w.preview}18` : 'var(--bg2)',
                border: `2px solid ${selectedWorld === w.id ? w.preview : 'var(--border)'}`,
                borderRadius: 14, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                boxShadow: selectedWorld === w.id ? `0 0 20px ${w.preview}40` : 'none',
                transition: 'all 0.2s'
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: w.bg, border: `1px solid ${w.preview}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, boxShadow: `0 0 12px ${w.preview}40`
                }}>{w.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: selectedWorld === w.id ? w.preview : 'var(--text)', marginBottom: 4 }}>
                    {lang === 'ru' ? w.nameRu : w.nameEn}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                    {lang === 'ru' ? w.descRu : w.descEn}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 16, color: selectedWorld === w.id ? w.preview : 'var(--border)' }}>
                  {selectedWorld === w.id ? '●' : '○'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 0 40px' }}>
          <button onClick={handleWorldDone} style={{
            width: '100%', padding: '14px',
            background: WORLDS.find(w => w.id === selectedWorld)?.preview || 'var(--gold)',
            color: '#000', border: 'none', borderRadius: 12,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.06em',
            boxShadow: `0 0 20px ${WORLDS.find(w => w.id === selectedWorld)?.preview || 'var(--gold)'}40`
          }}>
            {isFairyTheme(selectedWorld)
              ? (lang === 'ru' ? '✦ ДОБАВИТЬ ПЕРВУЮ ФЕЮ' : '✦ ADD FIRST FAIRY')
              : (lang === 'ru' ? '◈ СОЗДАТЬ ПЕРВОГО ГРЕМЛИНА' : '◈ CREATE FIRST GREMLIN')
            }
          </button>
        </div>
      </div>
    )
  }

  // ── Информационные слайды ─────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', padding: '0 24px' }}>
      {/* Skip — только в режиме firstTime */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0', minHeight: 48 }}>
        {isFirstTime && (
          <button onClick={() => setPhase('world')} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em'
          }}>
            {lang === 'ru' ? 'ПРОПУСТИТЬ' : 'SKIP'}
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
        {INFO_STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 20 : 6, height: 6, borderRadius: 3,
            background: i === step ? 'var(--gold)' : 'var(--bg3)',
            transition: 'all 0.3s',
            boxShadow: i === step ? '0 0 8px var(--accent-glow)' : 'none'
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'var(--bg2)', border: '1px solid var(--gold-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, boxShadow: '0 0 30px var(--accent-glow)'
        }}>
          {current.icon}
        </div>

        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 12, lineHeight: 1.3 }}>
            {lang === 'ru' ? current.titleRu : current.titleEn}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
            {lang === 'ru' ? current.textRu : current.textEn}
          </div>
        </div>
      </div>

      {/* Counter */}
      <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
        {step + 1} / {INFO_STEPS.length}
      </div>

      {/* Button */}
      <div style={{ padding: '0 0 40px' }}>
        <button onClick={handleNext} style={{
          width: '100%', padding: '14px',
          background: 'var(--gold)', color: '#000',
          border: 'none', borderRadius: 12,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.06em',
          boxShadow: '0 0 20px var(--accent-glow)'
        }}>
          {isLastInfo && !isFirstTime
            ? (lang === 'ru' ? '✓ ГОТОВО' : '✓ DONE')
            : isLastInfo
              ? (lang === 'ru' ? 'ВЫБРАТЬ МИР →' : 'CHOOSE WORLD →')
              : (lang === 'ru' ? 'ДАЛЕЕ →' : 'NEXT →')
          }
        </button>
      </div>
    </div>
  )
}
