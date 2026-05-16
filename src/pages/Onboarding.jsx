import { useState } from 'react'

const STEPS = [
  {
    icon: '✦',
    titleRu: 'Добро пожаловать в Pocket Spirits',
    titleEn: 'Welcome to Pocket Spirits',
    textRu: 'Твои личные ИИ-духи, которые следят за жизнью, собирают данные и дают советы. Ты вводишь информацию — они анализируют, запоминают и иногда добавляют что-то от себя.',
    textEn: 'Your personal AI spirits that track your life, collect data and give advice. You enter information — they analyze, remember, and sometimes add something on their own.',
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
    titleRu: 'Просто пиши им',
    titleEn: 'Just write to them',
    textRu: 'Вводи данные через форму каждого духа — они сразу фиксируют и обновляют статистику. А в чате можно спросить совет, получить анализ или просто поговорить.',
    textEn: 'Enter data through each spirit\'s form — they instantly record and update your stats. Use the chat to ask for advice, get analysis, or just talk.',
  },
  {
    icon: '📊',
    titleRu: 'Еженедельный отчёт',
    titleEn: 'Weekly report',
    textRu: 'Каждый понедельник все духи собираются на совет и присылают общую сводку: цифры, факты, рекомендации. Уведомление придёт прямо в Telegram.',
    textEn: 'Every Monday all spirits gather in council and send a general summary: numbers, facts, recommendations. A notification will arrive right in Telegram.',
  },
  {
    icon: '🎨',
    titleRu: 'Два мира на выбор',
    titleEn: 'Two worlds to choose from',
    textRu: 'Мир Гремлинов — стимпанк-механика, характерные персонажи.\nМир Фей — лесная магия, анимированные феи с живым фоном.\n\nМожно сменить в любой момент в Настройках.',
    textEn: 'Gremlins world — steampunk mechanics, character assistants.\nFairies world — forest magic, animated fairies with a living background.\n\nSwitch anytime in Settings.',
  },
]

export default function Onboarding({ lang, onDone }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', padding: '0 24px',
    }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0' }}>
        <button onClick={onDone} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em'
        }}>
          {lang === 'ru' ? 'ПРОПУСТИТЬ' : 'SKIP'}
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 40 }}>
        {STEPS.map((_, i) => (
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
          fontSize: 36,
          boxShadow: '0 0 30px var(--accent-glow)'
        }}>
          {current.icon}
        </div>

        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--text)',
            letterSpacing: '0.04em', marginBottom: 12, lineHeight: 1.3
          }}>
            {lang === 'ru' ? current.titleRu : current.titleEn}
          </div>
          <div style={{
            fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8,
            whiteSpace: 'pre-line'
          }}>
            {lang === 'ru' ? current.textRu : current.textEn}
          </div>
        </div>
      </div>

      {/* Step counter */}
      <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 12 }}>
        {step + 1} / {STEPS.length}
      </div>

      {/* Button */}
      <div style={{ padding: '0 0 40px' }}>
        <button
          onClick={() => isLast ? onDone() : setStep(s => s + 1)}
          style={{
            width: '100%', padding: '14px',
            background: 'var(--gold)', color: '#000',
            border: 'none', borderRadius: 12,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.06em',
            boxShadow: '0 0 20px var(--accent-glow)'
          }}
        >
          {isLast
            ? (lang === 'ru' ? '✦ СОЗДАТЬ ПЕРВОГО ДУХА' : '✦ CREATE FIRST SPIRIT')
            : (lang === 'ru' ? 'ДАЛЕЕ →' : 'NEXT →')
          }
        </button>
      </div>
    </div>
  )
}
