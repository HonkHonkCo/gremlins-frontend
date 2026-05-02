import { useState, useEffect } from 'react'
import './index.css'
import { syncUser } from './services/api'
import { getLang, setLang, t } from './i18n'
import Home from './pages/Home'
import GremlinDetail from './pages/GremlinDetail'
import AddGremlin from './pages/AddGremlin'
import WeeklyReport from './pages/WeeklyReport'
import Onboarding from './pages/Onboarding'
import Upgrade from './pages/Upgrade'
import { themes, getTheme, setTheme } from './themes.js'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [selectedGremlin, setSelectedGremlin] = useState(null)
  const [homeKey, setHomeKey] = useState(0)
  const [lang, setLangState] = useState(getLang())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [theme, setThemeState] = useState(getTheme())

  const changeLang = (l) => { setLang(l); setLangState(l) }
  const changeTheme = (id) => { setTheme(id); setThemeState(id) }

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const tgUser = tg?.initDataUnsafe?.user

    if (tgUser) {
      // Режим Telegram Mini App
      tg.expand()
      tg.setHeaderColor('#1a1812')
      tg.setBackgroundColor('#1a1812')
      const tgId = tgUser.id
      const username = tgUser.username || ''
      syncUser(tgId, username)
        .then(u => {
          setUser({ ...u, telegram_id: tgId, via: 'telegram' })
          const created = new Date(u.created_at)
          if (new Date() - created < 30000) setShowOnboarding(true)
        })
        .catch(e => console.error('sync error', e))
    } else {
      // Режим браузера — генерируем стабильный анонимный ID
      let browserId = localStorage.getItem('gremlins_browser_id')
      if (!browserId) {
        browserId = 'browser_' + Math.random().toString(36).slice(2) + Date.now()
        localStorage.setItem('gremlins_browser_id', browserId)
      }
      // Используем хэш как telegram_id (отрицательный чтобы не пересекаться с реальными)
      const fakeId = -(Math.abs(browserId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 999999999 + 1)
      syncUser(fakeId, 'web_user')
        .then(u => {
          setUser({ ...u, telegram_id: fakeId, via: 'browser' })
          const created = new Date(u.created_at)
          if (new Date() - created < 30000) setShowOnboarding(true)
        })
        .catch(e => console.error('browser sync error', e))
    }
  }, [])

  const goHome = () => { setPage('home'); setSelectedGremlin(null); setHomeKey(k => k + 1) }
  const finishOnboarding = () => { setShowOnboarding(false); setPage('add') }

  if (!user) return <div className="loading">{t(lang, 'loading')}</div>
  if (showOnboarding) return <Onboarding lang={lang} onDone={finishOnboarding} />

  return (
    <div className="app">
      {showUpgrade && (
        user?.via === 'browser' ? (
          // Браузерный пользователь — предлагаем перейти в телеграм для оплаты
          <div style={{
            position: 'fixed', inset: 0, background: '#000a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 24
          }}>
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--gold)',
              borderRadius: 16, padding: 28, maxWidth: 340, width: '100%',
              textAlign: 'center', fontFamily: 'inherit'
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {lang === 'ru' ? 'PRO доступен в Telegram' : 'PRO available in Telegram'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
                {lang === 'ru'
                  ? 'Оплата через Telegram Stars. Открой бота и оформи подписку — всё сохранится.'
                  : 'Payment via Telegram Stars. Open the bot and subscribe — your data is saved.'}
              </div>
              <a
                href="https://t.me/Mygremlins_bot"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block', background: 'var(--gold)', color: '#000',
                  borderRadius: 10, padding: '12px 0', fontSize: 13,
                  fontWeight: 700, textDecoration: 'none', marginBottom: 10,
                  letterSpacing: '0.04em'
                }}
              >
                {lang === 'ru' ? '→ Открыть в Telegram' : '→ Open in Telegram'}
              </a>
              <button
                onClick={() => setShowUpgrade(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                {lang === 'ru' ? 'закрыть' : 'close'}
              </button>
            </div>
          </div>
        ) : (
          <Upgrade lang={lang} reason="limit_reached" user={user} onClose={(paid) => {
            setShowUpgrade(false)
            if (paid) { setUser(u => ({ ...u, plan: 'pro' })); window.location.reload() }
          }} />
        )
      )}

      {(page === 'home' || page === 'report' || page === 'settings') && (
        <div className="topbar">
          <span style={{ fontSize: 14 }}>◈</span>
          <span className="topbar-title">{t(lang, 'appName')}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: page === 'gremlin' ? 'hidden' : 'auto' }}>
        {page === 'home' && (
          <Home key={homeKey} userId={user.id} lang={lang}
            onSelect={g => { setSelectedGremlin(g); setPage('gremlin') }}
            onAdd={() => setPage('add')}
            onReport={() => setPage('report')}
          />
        )}
        {page === 'gremlin' && selectedGremlin && (
          <GremlinDetail gremlin={selectedGremlin} userId={user.id} user={user} lang={lang} onBack={goHome} />
        )}
        {page === 'add' && (
          <AddGremlin userId={user.id} user={user} lang={lang} onBack={() => setPage('home')} onCreated={goHome} />
        )}
        {page === 'report' && <WeeklyReport userId={user.id} lang={lang} />}
        {page === 'settings' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{t(lang, 'settings')}</div>

            {/* Language */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>{t(lang, 'language')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => changeLang('ru')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: lang === 'ru' ? 'var(--gold)' : 'var(--bg3)', color: lang === 'ru' ? '#000' : 'var(--text-dim)', border: `1px solid ${lang === 'ru' ? 'var(--gold)' : 'var(--border)'}` }}>🇷🇺 Русский</button>
                <button onClick={() => changeLang('en')} style={{ flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: lang === 'en' ? 'var(--gold)' : 'var(--bg3)', color: lang === 'en' ? '#000' : 'var(--text-dim)', border: `1px solid ${lang === 'en' ? 'var(--gold)' : 'var(--border)'}` }}>🇬🇧 English</button>
              </div>
            </div>

            {/* Plan */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
                {lang === 'ru' ? 'Текущий план' : 'Current plan'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: user.plan === 'pro' ? 'var(--gold)' : 'var(--text)' }}>
                    {user.plan === 'pro' ? '⭐ PRO' : (lang === 'ru' ? 'Бесплатный' : 'Free')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                    {user.plan === 'pro'
                      ? (lang === 'ru' ? '12 гремлинов · безлимит' : '12 gremlins · unlimited')
                      : (lang === 'ru' ? '3 гремлина · 20 сообщений/день' : '3 gremlins · 20 messages/day')
                    }
                  </div>
                </div>
                {user.plan !== 'pro' && (
                  <button onClick={() => setShowUpgrade(true)} style={{
                    background: 'var(--gold)', color: '#000', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    letterSpacing: '0.04em'
                  }}>
                    ⭐ PRO
                  </button>
                )}
              </div>
            </div>

            {/* Theme */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
                {lang === 'ru' ? 'Тема оформления' : 'Theme'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {Object.entries(themes).map(([id, t]) => (
                  <button key={id} onClick={() => changeTheme(id)} style={{
                    background: theme === id ? 'var(--bg3)' : 'var(--bg2)',
                    border: `2px solid ${theme === id ? t.preview : 'var(--border)'}`,
                    borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                    boxShadow: theme === id ? `0 0 10px ${t.preview}40` : 'none',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.preview, boxShadow: `0 0 6px ${t.preview}`, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: theme === id ? t.preview : 'var(--text-dim)' }}>
                        {lang === 'ru' ? t.nameRu : t.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Onboarding */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <button onClick={() => setShowOnboarding(true)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px', fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit' }}>
                {lang === 'ru' ? '◈ Посмотреть онбординг снова' : '◈ View onboarding again'}
              </button>
            </div>
          </div>
        )}
      </div>

      {page !== 'gremlin' && page !== 'add' && (
        <nav className="bottomnav">
          <button className={`nav-btn ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>
            <span className="nav-icon">◈</span>{t(lang, 'navBase')}
          </button>
          <button className={`nav-btn ${page === 'report' ? 'active' : ''}`} onClick={() => setPage('report')}>
            <span className="nav-icon">◻</span>{t(lang, 'navReport')}
          </button>
          <button className={`nav-btn ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
            <span className="nav-icon">⚙</span>{lang === 'ru' ? 'НАСТРОЙКИ' : 'SETTINGS'}
          </button>
        </nav>
      )}
    </div>
  )
}
