import { useState, useEffect } from 'react'
import { getWeeklyReport } from '../services/api'

function getNextMonday() {
  const now = new Date()
  const day = now.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilMonday)
  next.setHours(9, 0, 0, 0)
  const diff = next - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return { days, hours, date: next.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) }
}

export default function WeeklyReport({ userId }) {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const next = getNextMonday()

  useEffect(() => {
    if (!userId) return
    getWeeklyReport(userId)
      .then(data => {
        if (data && data.report) {
          setReports([data.report])
          setSelected(data.report)
        } else if (Array.isArray(data)) {
          setReports(data)
          setSelected(data[0] || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">ЗАГРУЗКА...</div>

  return (
    <div style={{ padding: '12px 12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Next report countdown */}
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--gold)',
        borderRadius: '0 8px 8px 0',
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 3 }}>
            СЛЕДУЮЩИЙ ОТЧЁТ
          </div>
          <div style={{ fontSize: 11, color: 'var(--text)' }}>
            Понедельник, {next.date} в 09:00
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--gold)',
            textShadow: '0 0 10px #d4a01780'
          }}>
            {next.days}д {next.hours}ч
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>осталось</div>
        </div>
      </div>

      {/* No reports yet */}
      {reports.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            Отчёт генерируется раз в неделю.<br />
            Добавь данные гремлинам — и в понедельник увидишь сводку.
          </div>
        </div>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            ИСТОРИЯ ОТЧЁТОВ
          </div>

          {/* Week selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reports.map((r, i) => (
              <button
                key={r.id || i}
                onClick={() => setSelected(r)}
                style={{
                  background: selected?.id === r.id ? 'var(--bg3)' : 'var(--bg2)',
                  border: `1px solid ${selected?.id === r.id ? 'var(--gold-dim)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', fontFamily: 'inherit', width: '100%'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: selected?.id === r.id ? 700 : 400 }}>
                    Неделя от {r.week_start || '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {r.summary ? r.summary.slice(0, 40) + '...' : 'Нет данных'}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: selected?.id === r.id ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {selected?.id === r.id ? '▾' : '›'}
                </div>
              </button>
            ))}
          </div>

          {/* Selected report */}
          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
                <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  ▸ ОБЩЕЕ РЕЗЮМЕ
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selected.summary || selected.body || 'Нет данных'}
                </div>
              </div>

              {selected.all_stats && Object.keys(selected.all_stats).length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
                    ▸ ЦИФРЫ
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.entries(selected.all_stats).slice(0, 6).map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px' }}>
                        <div style={{
                          fontSize: 14, fontWeight: 700, color: 'var(--gold)',
                          textShadow: '0 0 8px #d4a01760'
                        }}>
                          {String(v)}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
