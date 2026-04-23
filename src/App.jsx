import { useState, useEffect } from 'react'
import './index.css'
import { syncUser } from './services/api'
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

    syncUser(tgId, username)
      .then(u => setUser(u))
      .catch(e => console.error('sync error', e))
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
      background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Courier New', monospace"
    }}>
      <div style={{ fontSize: 48 }}>◈</div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.1em' }}>GREMLINS BASE</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.7 }}>
        Открой приложение через Telegram
      </div>
      <a
        href="https://t.me/Mygremlins_bot"
        style={{
          marginTop: 8, background: 'var(--gold)', color: '#000',
          padding: '10px 24px', borderRadius: 8,
          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          textDecoration: 'none'
        }}
      >
        ОТКРЫТЬ В TELEGRAM
      </a>
    </div>
  )

  if (!user) return <div className="loading">GREMLINS BASE...</div>

  return (
    <div className="app">
      {(page === 'home' || page === 'report') && (
        <div className="topbar">
          <span style={{ fontSize: 14 }}>◈</span>
          <span className="topbar-title">PERSONAL GREMLINS</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}

      <div style={{ flex: 1, overflowY: page === 'gremlin' ? 'hidden' : 'auto' }}>
        {page === 'home' && (
          <Home
            key={homeKey}
            userId={user.id}
            onSelect={g => { setSelectedGremlin(g); setPage('gremlin') }}
            onAdd={() => setPage('add')}
          />
        )}
        {page === 'gremlin' && selectedGremlin && (
          <GremlinDetail
            gremlin={selectedGremlin}
            userId={user.id}
            onBack={goHome}
          />
        )}
        {page === 'add' && (
          <AddGremlin
            userId={user.id}
            onBack={() => setPage('home')}
            onCreated={goHome}
          />
        )}
        {page === 'report' && (
          <WeeklyReport userId={user.id} />
        )}
      </div>

      {page !== 'gremlin' && page !== 'add' && (
        <nav className="bottomnav">
          <button className={`nav-btn ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}>
            <span className="nav-icon">◈</span>БАЗА
          </button>
          <button className={`nav-btn ${page === 'report' ? 'active' : ''}`} onClick={() => setPage('report')}>
            <span className="nav-icon">◻</span>ОТЧЁТ
          </button>
          <button className="nav-btn" onClick={() => setPage('add')}>
            <span className="nav-icon">+</span>СОЗДАТЬ
          </button>
        </nav>
      )}
    </div>
  )
}
