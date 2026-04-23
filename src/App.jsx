import { useState, useEffect } from 'react'
import './index.css'
import { syncUser } from './services/api'
import Home from './pages/Home'
import GremlinDetail from './pages/GremlinDetail'
import AddGremlin from './pages/AddGremlin'
import WeeklyReport from './pages/WeeklyReport'

const DEV_TELEGRAM_ID = 999999999

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [selectedGremlin, setSelectedGremlin] = useState(null)
  const [homeKey, setHomeKey] = useState(0)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    let tgId = DEV_TELEGRAM_ID
    let username = 'dev'

    if (tg?.initDataUnsafe?.user) {
      tgId = tg.initDataUnsafe.user.id
      username = tg.initDataUnsafe.user.username || ''
      tg.expand()
      tg.setHeaderColor('#0e0d0b')
      tg.setBackgroundColor('#0e0d0b')
    }

    syncUser(tgId, username)
      .then(u => setUser(u))
      .catch(e => console.error('sync error', e))
  }, [])

  const goHome = () => {
    setPage('home')
    setSelectedGremlin(null)
    setHomeKey(k => k + 1)
  }

  if (!user) return <div className="loading">GREMLINS BASE...</div>

  return (
    <div className="app">
      {(page === 'home' || page === 'report') && (
        <div className="topbar">
          <span style={{ fontSize: 14 }}>◈</span>
          <span className="topbar-title">GREMLINS BASE</span>
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
