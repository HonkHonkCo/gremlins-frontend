import { useState } from 'react'

export default function Upgrade({ lang, reason, onClose }) {
  const [loading, setLoading] = useState(false)

  const isMessageLimit = reason === 'message_limit_reached'
  const isGremlinLimit = reason === 'limit_reached'

  const handleUpgrade = () => {
    setLoading(true)
    // Telegram Stars invoice — открываем бота для оплаты
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.openInvoice('https://t.me/Mygremlins_bot?start=upgrade_pro', (status) => {
        if (status === 'paid') {
          onClose(true) // true = успешно оплачено
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000aa',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: 'var(--bg2)', width: '100%', maxWidth: 480,
        borderRadius: '20px 20px 0 0', padding: '24px 20px 40px',
        border: '1px solid var(--border)', borderBottom: 'none'
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em' }}>
            {lang === 'ru' ? 'НУЖЕН PRO' : 'UPGRADE TO PRO'}
          </div>
        </div>

        {/* Reason */}
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>
          {isMessageLimit && (lang === 'ru'
            ? 'Ты использовал 20 сообщений сегодня. Лимит бесплатного плана исчерпан.'
            : 'You used 20 messages today. Free plan limit reached.'
          )}
          {isGremlinLimit && (lang === 'ru'
            ? 'На бесплатном плане можно создать до 3 гремлинов.'
            : 'Free plan allows up to 3 gremlins.'
          )}
        </div>

        {/* Features */}
        <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 12 }}>
            PRO {lang === 'ru' ? 'ВКЛЮЧАЕТ' : 'INCLUDES'}
          </div>
          {[
            lang === 'ru' ? '✓ До 12 гремлинов' : '✓ Up to 12 gremlins',
            lang === 'ru' ? '✓ Безлимитные сообщения' : '✓ Unlimited messages',
            lang === 'ru' ? '✓ Приоритетные ответы' : '✓ Priority responses',
            lang === 'ru' ? '✓ Расширенная статистика' : '✓ Advanced statistics',
          ].map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6 }}>{f}</div>
          ))}
        </div>

        {/* Price */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 20px #d4a01760' }}>
            200 ⭐
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {lang === 'ru' ? 'в месяц · Telegram Stars' : 'per month · Telegram Stars'}
          </div>
        </div>

        {/* Buttons */}
        <button onClick={handleUpgrade} disabled={loading} style={{
          width: '100%', padding: '14px', background: 'var(--gold)',
          color: '#000', border: 'none', borderRadius: 12,
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.06em',
          boxShadow: '0 0 20px #d4a01740', marginBottom: 10
        }}>
          {loading
            ? (lang === 'ru' ? 'ОТКРЫВАЕМ...' : 'OPENING...')
            : (lang === 'ru' ? '⭐ ПОЛУЧИТЬ PRO' : '⭐ GET PRO')
          }
        </button>

        <button onClick={() => onClose(false)} style={{
          width: '100%', padding: '12px', background: 'none',
          color: 'var(--text-muted)', border: 'none',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit'
        }}>
          {lang === 'ru' ? 'Не сейчас' : 'Not now'}
        </button>
      </div>
    </div>
  )
}
