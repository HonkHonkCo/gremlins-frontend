import { useState } from 'react'
import { t } from '../i18n'

const STEPS = [
  {
    icon: '◈',
    titleRu: 'Добро пожаловать в Personal Gremlins',
    titleEn: 'Welcome to Personal Gremlins',
    textRu: 'Твои личные ИИ-помощники которые следят за жизнью и дают советы. Каждый гремлин отвечает за свою сферу.',
    textEn: 'Your personal AI assistants that track your life and give advice. Each gremlin handles its own area.',
  },
  {
    icon: '🧮',
    titleRu: 'Создай своих гремлинов',
    titleEn: 'Create your gremlins',
    textRu: 'Бухгалтер считает расходы и доходы. Тренер следит за здоровьем. Секретарь помнит дедлайны. Шеф следит за питанием.',
    textEn: 'Accountant tracks expenses and income. Trainer monitors health. Secretary remembers deadlines. Chef tracks nutrition.',
  },
  {
    icon: '💬',
    titleRu: 'Просто пиши им',
    titleEn: 'Just write to them',
    textRu: 'Написал "потратил 500 бат на еду" — бухгалтер запомнил. Они видят данные друг друга и дают советы с учётом всей картины.',
    textEn: 'Write "spent 500 baht on food" — the accountant remembers. They see each other\'s data and give advice based on the full picture.',
  },
  {
    icon: '📊',
    titleRu: 'Еженедельный отчёт',
    titleEn: 'Weekly report',
    textRu: 'Каждый понедельник все гремлины собираются и дают общую сводку: цифры, факты, рекомендации.',
    textEn: 'Every Monday all gremlins gather and give a general summary: numbers, facts, recommendations.',
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
            boxShadow: i === step ? '0 0 8px #d4a01780' : 'none'
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
          boxShadow: '0 0 30px #d4a01720'
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
            fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7
          }}>
            {lang === 'ru' ? current.textRu : current.textEn}
          </div>
        </div>
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
            boxShadow: '0 0 20px #d4a01740'
          }}
        >
          {isLast
            ? (lang === 'ru' ? '◈ СОЗДАТЬ ПЕРВОГО ГРЕМЛИНА' : '◈ CREATE FIRST GREMLIN')
            : (lang === 'ru' ? 'ДАЛЕЕ →' : 'NEXT →')
          }
        </button>
      </div>
    </div>
  )
}
