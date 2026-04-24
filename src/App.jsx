import { useState, useEffect } from 'react'
import './index.css'
import { syncUser } from './services/api'
import { getLang, setLang, t } from './i18n'
import Home from './pages/Home'
import GremlinDetail from './pages/GremlinDetail'
import AddGremlin from './pages/AddGremlin'
import WeeklyReport from './pages/WeeklyReport'

export default function App() {
  const [user, setUser] = useState(null)
  const [notInTelegram, setNotInTelegram] = useState(false)
  const [page, setPage] = useState('home')
  const [selectedGremlin, setSelectedGremlin] = useState(null)
  const [homeKey, setHomeKey] = useState(0)
  const [lang, setLangState] = useState(getLang())

  const changeLang = (l) => {
    setLang(l)
    setLangState(l)
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.initDataUnsafe?.user) {
      setNotInTelegram(true)
      return
    }
    const tgId = tg.initDataUnsafe.user.id
    const username = tg.initDataUnsafe.user.username || ''
    tg.expand()
    tg.setHeaderColor('#0e0d0b')
    tg.setBackgroundColor('#0e0d0b')
    syncUser(tgId, username).then(u => setUser(u)).catch(e => console.error('sync error', e))
  }, [])

  const goHome = () => {
    setPage('home')
    setSelectedGremlin(null)
    setHomeKey(k => k + 1)
  }

  if (notInTelegram) return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Courier New', monospace"
    }}>
      <div style={{ fontSize: 48 }}>◈</div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>PERSONAL GREMLINS</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.7 }}>
        {t(lang, 'openInTelegram')}
      </div>
      <a href="https://t.me/Mygremlins_bot" style={{
        marginTop: 8, background: 'var(--gold)', color: '#000',
        padding: '10px 24px', borderRadius: 8,
        fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none'
      }}>{t(lang, 'openButton')}</a>
    </div>
  )

  if (!user) return <div className="loading">{t(lang, 'loading')}</div>

  return (
    <div className="app">
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
          <GremlinDetail gremlin={selectedGremlin} userId={user.id} lang={lang} onBack={goHome} />
        )}
        {page === 'add' && (
          <AddGremlin userId={user.id} lang={lang} onBack={() => setPage('home')} onCreated={goHome} />
        )}
        {page === 'report' && <WeeklyReport userId={user.id} lang={lang} />}
        {page === 'settings' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              {t(lang, 'settings')}
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
                {t(lang, 'language')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => changeLang('ru')} style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: lang === 'ru' ? 'var(--gold)' : 'var(--bg3)',
                  color: lang === 'ru' ? '#000' : 'var(--text-dim)',
                  border: `1px solid ${lang === 'ru' ? 'var(--gold)' : 'var(--border)'}`,
                }}>🇷🇺 Русский</button>
                <button onClick={() => changeLang('en')} style={{
                  flex: 1, padding: '8px', borderRadius: 8, fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: lang === 'en' ? 'var(--gold)' : 'var(--bg3)',
                  color: lang === 'en' ? '#000' : 'var(--text-dim)',
                  border: `1px solid ${lang === 'en' ? 'var(--gold)' : 'var(--border)'}`,
                }}>🇬🇧 English</button>
              </div>
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
