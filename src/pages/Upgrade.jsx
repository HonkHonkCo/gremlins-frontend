import { useState } from 'react'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Upgrade({ lang, reason, user, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMessageLimit = reason === 'message_limit_reached'
  const isGremlinLimit = reason === 'limit_reached'

  const handleUpgrade = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${BASE_URL}/payments/invoice`, {
        telegram_id: user?.telegram_id,
        user_id: user?.id
      })
      const invoiceUrl = res.data.invoice_url
      const tg = window.Telegram?.WebApp
      if (tg && invoiceUrl) {
        tg.openInvoice(invoiceUrl, (status) => {
          if (status === 'paid') {
            onClose(true)
          } else {
            setLoading(false)
          }
        })
      } else {
        setError(lang === 'ru' ? 'Открой в Telegram' : 'Open in Telegram')
        setLoading(false)
      }
    } catch (err) {
      setError(err?.response?.data?.error || (lang === 'ru' ? 'Ошибка. Попробуй снова.' : 'Error. Try again.'))
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
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>⚡</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em' }}>
            {lang === 'ru' ? 'НУЖЕН PRO' : 'UPGRADE TO PRO'}
          </div>
        </div>

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

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 20px #d4a01760' }}>
            200 ⭐
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {lang === 'ru' ? 'в месяц · Telegram Stars' : 'per month · Telegram Stars'}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: 11, color: '#e24b4a', textAlign: 'center', marginBottom: 10 }}>
            {error}
          </div>
        )}

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
