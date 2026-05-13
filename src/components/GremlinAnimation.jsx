import { useEffect, useRef, useState } from 'react'
import { getTheme } from '../themes.js'

// ── Стимпанк-гремлины (спрайт-лента) ──────────────────────────────────────
const STEAMPUNK_FRAMES = 50
const STEAMPUNK_FPS = 6
const ROLE_PREFIX = {
  chef:       'Chef/Chef00001',
  accountant: 'Accountant/Accountant00001',
  trainer:    'Trainer/Trainer00001',
  secretary:  'Secretary/Secretary00001',
}
const SUPABASE_URL = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/gremlins-anim'

// ── Феи (отдельные кадры) ──────────────────────────────────────────────────
const FAIRY_FRAMES = 34
const FAIRY_FPS = 10
const FAIRY_COLORS = ['Green', 'Purple', 'Pink', 'Blue', 'Gold']
const FAIRY_URL = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/fairies-anim'

// Цвет феи по роли (детерминированно)
const ROLE_FAIRY_COLOR = {
  accountant: 'Gold',
  trainer:    'Blue',
  chef:       'Pink',
  secretary:  'Purple',
}

// ── Стимпанк-компонент (оригинальная логика) ───────────────────────────────
function SteampunkAnimation({ role, accentColor, talking }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 1520, h: 380 })

  useEffect(() => {
    frames.current = []
    frameIndex.current = 0
    setLoaded(false)
    setError(false)

    const prefix = ROLE_PREFIX[role]
    if (!prefix) { setError(true); return }

    let loadedCount = 0
    let errorCount = 0

    for (let i = 0; i < STEAMPUNK_FRAMES; i++) {
      const img = new Image()
      const num = String(i).padStart(5, '0')
      img.src = `${SUPABASE_URL}/${prefix}_${num}.png`
      img.onload = () => {
        if (i === 0) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
        loadedCount++
        if (loadedCount + errorCount === STEAMPUNK_FRAMES) {
          if (loadedCount > 0) setLoaded(true)
          else setError(true)
        }
      }
      img.onerror = () => {
        errorCount++
        if (loadedCount + errorCount === STEAMPUNK_FRAMES) {
          if (loadedCount > 0) setLoaded(true)
          else setError(true)
        }
      }
      frames.current[i] = img
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [role])

  useEffect(() => {
    if (!loaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    const interval = 1000 / STEAMPUNK_FPS

    function draw(timestamp) {
      if (timestamp - lastTime.current >= interval) {
        const frame = frames.current[frameIndex.current]
        if (frame?.complete && frame.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        }
        frameIndex.current = (frameIndex.current + 1) % STEAMPUNK_FRAMES
        lastTime.current = timestamp
      }
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [loaded])

  if (error) return null

  const targetH = 100
  const scale = targetH / naturalSize.h
  const scaledW = naturalSize.w * scale

  return (
    <div style={{ width: '100%', height: targetH, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {!loaded && <div style={{ color: accentColor, opacity: 0.3, fontSize: 12 }}>...</div>}
      <canvas
        ref={canvasRef}
        width={naturalSize.w}
        height={naturalSize.h}
        style={{ width: scaledW, height: targetH, flexShrink: 0, display: loaded ? 'block' : 'none', background: 'transparent' }}
      />
      {talking && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`, animation: 'pulse 0.8s ease-in-out infinite', pointerEvents: 'none' }} />
      )}
    </div>
  )
}

// ── Фея-компонент ──────────────────────────────────────────────────────────
function FairyAnimation({ role, accentColor, talking, size = 110 }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const [loaded, setLoaded] = useState(false)

  const colorName = ROLE_FAIRY_COLOR[role] || 'Green'

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    frames.current = []
    frameIndex.current = 0
    lastTime.current = 0
    setLoaded(false)

    let done = 0
    let ok = 0

    for (let i = 0; i < FAIRY_FRAMES; i++) {
      const img = new Image()
      img.src = `${FAIRY_URL}/Fairies/${colorName}/${colorName}F_ready_${String(i).padStart(5, '0')}.png`
      img.onload = () => { ok++; done++; if (done === FAIRY_FRAMES && ok > 0) setLoaded(true) }
      img.onerror = () => { done++; if (done === FAIRY_FRAMES && ok > 0) setLoaded(true) }
      frames.current[i] = img
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [colorName])

  useEffect(() => {
    if (!loaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    const interval = 1000 / FAIRY_FPS

    function draw(ts) {
      if (ts - lastTime.current >= interval) {
        const frame = frames.current[frameIndex.current]
        if (frame?.complete && frame.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        }
        frameIndex.current = (frameIndex.current + 1) % FAIRY_FRAMES
        lastTime.current = ts
      }
      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [loaded])

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', paddingTop: 8 }}>
      {/* Мерцающий ореол за феей */}
      <div style={{
        position: 'absolute',
        width: size * 0.85, height: size * 0.85,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}28 0%, transparent 70%)`,
        filter: 'blur(18px)',
        animation: 'fairy-glow-pulse 2.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {!loaded && (
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: accentColor, opacity: 0.4, fontSize: 11, letterSpacing: '0.1em' }}>✦</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ width: size, height: size, display: loaded ? 'block' : 'none', background: 'transparent', position: 'relative', zIndex: 1 }}
      />
      {talking && (
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle, ${accentColor}20 0%, transparent 60%)`, animation: 'pulse 0.8s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />
      )}
    </div>
  )
}

// ── Главный экспорт — переключает по теме ─────────────────────────────────
export default function GremlinAnimation({ role, accentColor, talking, size = 220, theme }) {
  // theme prop приоритетен, fallback — читаем из localStorage
  const activeTheme = theme || getTheme()

  if (activeTheme === 'fairy') {
    return <FairyAnimation role={role} accentColor={accentColor} talking={talking} size={size} />
  }

  return <SteampunkAnimation role={role} accentColor={accentColor} talking={talking} />
}
