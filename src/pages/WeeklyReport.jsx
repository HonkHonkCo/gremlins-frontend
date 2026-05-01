import { useState, useEffect, useRef } from 'react'
import { getWeeklyReport } from '../services/api'
import { t } from '../i18n'

const REPORT_FRAMES = 5
const SUPABASE_STORAGE = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/gremlins-anim'

function ReportAnimation() {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let done = 0
    let ok = 0
    for (let i = 0; i < REPORT_FRAMES; i++) {
      const img = new Image()
      const num = String(i).padStart(5, '0')
      img.src = `${SUPABASE_STORAGE}/Report/Report_${num}.png`
      img.onload = () => {
        frames.current[i] = img
        ok++; done++
        if (done === REPORT_FRAMES) setStatus(ok > 0 ? 'ready' : 'error')
      }
      img.onerror = () => {
        done++
        if (done === REPORT_FRAMES) setStatus(ok > 0 ? 'ready' : 'error')
      }
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  useEffect(() => {
    if (status !== 'ready') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const interval = 1000 / 6

    function draw(ts) {
      if (ts - lastTime.current >= interval) {
        const frame = frames.current[frameIndex.current]
        if (frame?.complete && frame.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        }
        frameIndex.current = (frameIndex.current + 1) % REPORT_FRAMES
        lastTime.current = ts
      }
      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [status])

  if (status !== 'ready') return <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ width: 100, height: 100, marginBottom: 12 }}
    />
  )
}

function getNextMonday(lang) {
  const now = new Date()
  const day = now.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilMonday)
  next.setHours(9, 0, 0, 0)
  const diff = next - now
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return {
    days, hours,
    date: next.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
  }
}

export default function WeeklyReport({ userId, lang }) {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const next = getNextMonday(lang)

  useEffect(() => {
    if (!userId) return
    getWeeklyReport(userId)
      .then(data => {
        if (data && data.report) { setReports([data.report]); setSelected(data.report) }
        else if (Array.isArray(data)) { setReports(data); setSelected(data[0] || null) }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="loading">{t(lang, 'loading')}</div>

  return (
    <div style={{ padding: '12px 12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', borderRadius: '0 8px 8px 0', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 3 }}>
            {t(lang, 'nextReport')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text)' }}>
            {t(lang, 'monday')}, {next.date} {t(lang, 'at')} 09:00
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 10px #d4a01780' }}>
            {next.days}{lang === 'ru' ? 'д' : 'd'} {next.hours}{lang === 'ru' ? 'ч' : 'h'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t(lang, 'daysLeft')}</div>
        </div>
      </div>

      {reports.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ReportAnimation />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            {t(lang, 'noReports')}<br />{t(lang, 'noReportsSub')}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {t(lang, 'reportHistory')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reports.map((r, i) => (
              <button key={r.id || i} onClick={() => setSelected(r)} style={{
                background: selected?.id === r.id ? 'var(--bg3)' : 'var(--bg2)',
                border: `1px solid ${selected?.id === r.id ? 'var(--gold-dim)' : 'var(--border)'}`,
                borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'inherit', width: '100%'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: selected?.id === r.id ? 700 : 400 }}>
                    {t(lang, 'weekFrom')} {r.week_start || '—'}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                    {r.summary ? r.summary.slice(0, 40) + '...' : t(lang, 'noData')}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: selected?.id === r.id ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {selected?.id === r.id ? '▾' : '›'}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div className="card" style={{ borderColor: 'var(--gold-dim)' }}>
                <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 8 }}>
                  {t(lang, 'summary')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selected.summary || selected.body || t(lang, 'noData')}
                </div>
              </div>
              {selected.all_stats && Object.keys(selected.all_stats).length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 9, color: 'var(--gold-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {t(lang, 'numbers')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {Object.entries(selected.all_stats).slice(0, 6).map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '8px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 8px #d4a01760' }}>{String(v)}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>{t(lang, 'stats')?.[k] || k}</div>
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
