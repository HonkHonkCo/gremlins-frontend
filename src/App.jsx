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
  const [notInTelegram, setNotInTelegram] = useState(false)
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
    if (!tg?.initDataUnsafe?.user) { setNotInTelegram(true); return }
    const tgId = tg.initDataUnsafe.user.id
    const username = tg.initDataUnsafe.user.username || ''
    tg.expand()
    tg.setHeaderColor('#0e0d0b')
    tg.setBackgroundColor('#0e0d0b')
    syncUser(tgId, username)
      .then(u => {
        setUser({ ...u, telegram_id: tgId })
        const created = new Date(u.created_at)
        const now = new Date()
        if (now - created < 30000) setShowOnboarding(true)
      })
      .catch(e => console.error('sync error', e))
  }, [])

  const goHome = () => { setPage('home'); setSelectedGremlin(null); setHomeKey(k => k + 1) }
  const finishOnboarding = () => { setShowOnboarding(false); setPage('add') }

  if (notInTelegram) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'var(--bg)', color: 'var(--text)', fontFamily: "'CMUTypewriter', 'Courier New', monospace" }}>
      <div style={{ fontSize: 48 }}>◈</div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>PERSONAL GREMLINS</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.7 }}>{t(lang, 'openInTelegram')}</div>
      <a href="https://t.me/Mygremlins_bot" style={{ marginTop: 8, background: 'var(--gold)', color: '#000', padding: '10px 24px', borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none' }}>{t(lang, 'openButton')}</a>
    </div>
  )

  if (!user) return <div className="loading">{t(lang, 'loading')}</div>
  if (showOnboarding) return <Onboarding lang={lang} onDone={finishOnboarding} />

  return (
    <div className="app">
      {showUpgrade && (
        <Upgrade lang={lang} reason="limit_reached" user={user} onClose={(paid) => {
          setShowUpgrade(false)
          if (paid) { setUser(u => ({ ...u, plan: 'pro' })); window.location.reload() }
        }} />
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
