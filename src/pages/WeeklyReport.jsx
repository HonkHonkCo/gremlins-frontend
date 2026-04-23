import { useState, useEffect } from 'react'
import { getWeeklyReport } from '../services/api'

export default function WeeklyReport({ telegramId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!telegramId) return
    getWeeklyReport(telegramId)
      .then(data => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [telegramId])

  if (loading) return <div className="loading">ЗАГРУЗКА...</div>

  if (!report || !report.summary) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          Отчёт генерируется раз в неделю.<br />
          Добавь данные гремлинам — и в понедельник увидишь сводку.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
        Неделя от {report.week_start || '—'}
      </div>

      <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>▸ ОБЩЕЕ РЕЗЮМЕ</div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {report.summary}
        </div>
      </div>

      {report.all_stats && Object.keys(report.all_stats).length > 0 && (
        <div className="card">
          <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>▸ ЦИФРЫ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(report.all_stats).slice(0, 6).map(([k, v]) => (
              <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{String(v)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
