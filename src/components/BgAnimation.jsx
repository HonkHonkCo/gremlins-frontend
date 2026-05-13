import { useEffect, useRef } from 'react'

const SUPABASE = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public'

const BG_CONFIGS = {
  default: {
    base: `${SUPABASE}/bg-animation/`,
    total: 84,
    fps: 12,
    getUrl: (i) => `${SUPABASE}/bg-animation/01_${String(i + 1).padStart(5, '0')}.jpg`,
    opacity: 0.85,
  },
  fairy: {
    total: 48,
    fps: 10,
    getUrl: (i) => `${SUPABASE}/fairies-anim/BG/BG_F_${String(i).padStart(5, '0')}.png`,
    opacity: 0.9,
  },
}

export default function BgAnimation({ theme = 'default' }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const currentTheme = useRef(theme)

  useEffect(() => {
    currentTheme.current = theme
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = 480
    canvas.height = 800

    // Останавливаем предыдущую анимацию
    cancelAnimationFrame(animRef.current)
    frames.current = []
    frameIndex.current = 0
    lastTime.current = 0

    const cfg = BG_CONFIGS[theme] || BG_CONFIGS.default
    let loaded = 0

    for (let i = 0; i < cfg.total; i++) {
      const img = new Image()
      img.src = cfg.getUrl(i)
      img.onload = () => { loaded++; if (loaded === cfg.total) startAnimation() }
      img.onerror = () => { loaded++; if (loaded === cfg.total) startAnimation() }
      frames.current[i] = img
    }

    function startAnimation() {
      const interval = 1000 / cfg.fps
      function draw(timestamp) {
        if (timestamp - lastTime.current >= interval) {
          const frame = frames.current[frameIndex.current]
          if (frame?.complete && frame.naturalWidth > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
          }
          frameIndex.current = (frameIndex.current + 1) % cfg.total
          lastTime.current = timestamp
        }
        animRef.current = requestAnimationFrame(draw)
      }
      animRef.current = requestAnimationFrame(draw)
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', height: '100%',
        maxWidth: 480,
        opacity: (BG_CONFIGS[theme] || BG_CONFIGS.default).opacity,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'opacity 0.5s',
      }}
    />
  )
}

// Цвет феи по порядковому номеру гремлина (для GremlinDetail)
const FAIRY_COLORS = ['Green', 'Purple', 'Pink', 'Blue', 'Gold']
export function getFairyColor(index) {
  return FAIRY_COLORS[index % FAIRY_COLORS.length]
}

// Компонент анимации феи (заменяет PNG гремлина в теме фей)
export function FairyAnimation({ colorName, size = 140 }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const TOTAL = 34
  const FPS = 10

  useEffect(() => {
    cancelAnimationFrame(animRef.current)
    frames.current = []
    frameIndex.current = 0

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = 300
    canvas.height = 300

    let loaded = 0
    for (let i = 0; i < TOTAL; i++) {
      const img = new Image()
      img.src = `${SUPABASE}/fairies-anim/Fairies/${colorName}/${colorName}F_ready_${String(i).padStart(5, '0')}.png`
      img.onload = () => { loaded++; if (loaded === TOTAL) startAnim() }
      img.onerror = () => { loaded++; if (loaded === TOTAL) startAnim() }
      frames.current[i] = img
    }

    function startAnim() {
      const interval = 1000 / FPS
      function draw(ts) {
        if (ts - lastTime.current >= interval) {
          const frame = frames.current[frameIndex.current]
          if (frame?.complete && frame.naturalWidth > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
          }
          frameIndex.current = (frameIndex.current + 1) % TOTAL
          lastTime.current = ts
        }
        animRef.current = requestAnimationFrame(draw)
      }
      animRef.current = requestAnimationFrame(draw)
    }

    return () => cancelAnimationFrame(animRef.current)
  }, [colorName])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{ width: size, height: size, display: 'block' }}
    />
  )
}
