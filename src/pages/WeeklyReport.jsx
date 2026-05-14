import { useState, useEffect, useRef } from 'react'
import { getWeeklyReport } from '../services/api'
import { getTheme, isFairyTheme } from '../themes.js'
import { t } from '../i18n'

const SUPABASE = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public'

const ANIM_CONFIGS = {
  default: { total: 5, fps: 6, size: 85, getUrl: (i) => `${SUPABASE}/gremlins-anim/Report/Report_${String(i).padStart(5,'0')}.png` },
  fairy:   { total: 32, fps: 10, size: 120, getUrl: (i) => `${SUPABASE}/fairies-anim/Report/Report_F_${String(i).padStart(5,'0')}.png` },
}

function ReportAnimation({ theme = 'default' }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const [status, setStatus] = useState('loading')

  const cfg = ANIM_CONFIGS[theme] || ANIM_CONFIGS.default

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    frames.current = []
    frameIndex.current = 0
    setStatus('loading')
    let done = 0, ok = 0
    for (let i = 0; i < cfg.total; i++) {
      const img = new Image()
      img.src = cfg.getUrl(i)
      img.onload = () => { frames.current[i] = img; ok++; done++; if (done === cfg.total) setStatus(ok > 0 ? 'ready' : 'error') }
      img.onerror = () => { done++; if (done === cfg.total) setStatus(ok > 0 ? 'ready' : 'error') }
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [theme])

  useEffect(() => {
    if (status !== 'ready') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const interval = 1000 / cfg.fps
    function draw(ts) {
      if (ts - lastTime.current >= interval) {
        const frame = frames.current[frameIndex.current]
        if (frame?.complete && frame.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        }
        frameIndex.current = (frameIndex.current + 1) % cfg.total
        lastTime.current = ts
      }
      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [status])

  if (status !== 'ready') return <div style={{ width: cfg.size, height: cfg.size, marginBottom: 12 }} />
  return (
    <canvas ref={canvasRef} width={300} height={300}
      style={{ width: cfg.size, height: cfg.size, marginBottom: 12 }} />
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

export default function WeeklyReport({ userId, telegramId, lang }) {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const themeId = getTheme()
  const theme = isFairyTheme(themeId) ? 'fairy' : themeId
  const next = getNextMonday(lang)

  useEffect(() => {
    const id = telegramId || userId
    if (!id) return
    getWeeklyReport(id)
      .then(data => {
        // Бэкенд возвращает {ok, reports:[...]} или {ok, report:{...}}
        if (data?.reports?.length) {
          setReports(data.reports)
          setSelected(data.reports[0])
        } else if (data?.report) {
          setReports([data.report])
          setSelected(data.report)
        } else if (Array.isArray(data)) {
          setReports(data)
          setSelected(data[0] || null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, telegramId])

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
          <ReportAnimation theme={theme} />
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            {t(lang, 'noReports')}<br />{theme === 'fairy' ? t(lang, 'noReportsSubFairy') : t(lang, 'noReportsSub')}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            {t(lang, 'reportHistory')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reports.map((r, i) => {
              const isOpen = selected?.id === r.id
              const weekEnd = r.week_start
                ? new Date(new Date(r.week_start).getTime() + 6 * 86400000).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
                : '—'
              const weekStartFmt = r.week_start
                ? new Date(r.week_start).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
                : '—'

              // Иконки статы для превью
              const s = r.all_stats || {}
              const previewChips = []
              const expKey = Object.keys(s).find(k => k.startsWith('expense_'))
              if (expKey) {
                const cur = expKey.split('_')[1].toUpperCase()
                previewChips.push({ icon: '💸', val: s[expKey].toLocaleString('ru-RU') + ' ' + cur })
              }
              if (s.workouts_count) previewChips.push({ icon: '🏋️', val: s.workouts_count })
              if (s.tasks_done) previewChips.push({ icon: '✅', val: s.tasks_done })

              const STAT_LABELS = {
                expense_thb: 'Расходы ฿', expense_rub: 'Расходы ₽', expense_usd: 'Расходы $',
                income_thb: 'Доходы ฿', income_rub: 'Доходы ₽', income_usd: 'Доходы $',
                workouts_count: 'Тренировок', workouts_minutes: 'Минут', workouts_calories: 'Сожжено ккал',
                workout_types: 'Виды', tasks_done: 'Задач закрыто', tasks_high: 'Срочных',
                meals_count: 'Приёмов пищи', avg_calories: 'Ср. ккал', avg_protein: 'Ср. белок г',
              }

              return (
                <div key={r.id || i} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${isOpen ? 'var(--gold)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
                  {/* Заголовок — всегда виден, клик открывает/закрывает */}
                  <button onClick={() => setSelected(isOpen ? null : r)} style={{
                    background: isOpen ? 'var(--bg3)' : 'var(--bg2)',
                    border: 'none', padding: '10px 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', fontFamily: 'inherit', width: '100%', transition: 'background 0.2s'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 11, color: isOpen ? 'var(--gold)' : 'var(--text)', fontWeight: isOpen ? 700 : 400 }}>
                        {weekStartFmt} — {weekEnd}
                      </div>
                      {!isOpen && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {previewChips.map((c, j) => (
                            <span key={j} style={{ fontSize: 9, color: 'var(--text-muted)' }}>{c.icon} {c.val}</span>
                          ))}
                          {previewChips.length === 0 && (
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                              {r.summary?.slice(0, 35) || '—'}...
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: isOpen ? 'var(--gold)' : 'var(--text-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</div>
                  </button>

                  {/* Раскрытое содержимое */}
                  {isOpen && (
                    <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg2)' }}>
                      {/* Числовые показатели */}
                      {s && Object.keys(s).length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 10 }}>
                          {Object.entries(s).filter(([k, v]) => v && v !== '').slice(0, 6).map(([k, v]) => (
                            <div key={k} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textShadow: '0 0 8px #d4a01760' }}>{String(v)}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{STAT_LABELS[k] || k}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Текст отчёта */}
                      <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px', borderLeft: '2px solid var(--gold)' }}>
                        <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 6 }}>
                          {lang === 'ru' ? (theme === 'fairy' ? 'СОВЕТ ФЕЙ' : 'КОНСИЛИУМ ГРЕМЛИНОВ') : (theme === 'fairy' ? 'FAIRY COUNCIL' : 'GREMLIN COUNCIL')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                          {r.summary || r.body || '—'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
