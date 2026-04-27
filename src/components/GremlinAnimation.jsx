import { useEffect, useRef, useState } from 'react'

const TOTAL_FRAMES = 50
const FPS = 6

const ROLE_PREFIX = {
  chef: 'Chef/Chef00001',
  accountant: 'Accountant/Accountant00001',
  trainer: 'Trainer/Trainer00001',
  secretary: 'Secretary/Secretary00001',
}

const SUPABASE_URL = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/gremlins-anim'

export default function GremlinAnimation({ role, accentColor, talking }) {
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

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image()
      const num = String(i).padStart(5, '0')
      img.src = `${SUPABASE_URL}/${prefix}_${num}.png`
      img.onload = () => {
        if (i === 0) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
        loadedCount++
        if (loadedCount + errorCount === TOTAL_FRAMES) {
          if (loadedCount > 0) setLoaded(true)
          else setError(true)
        }
      }
      img.onerror = () => {
        errorCount++
        if (loadedCount + errorCount === TOTAL_FRAMES) {
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
    const interval = 1000 / FPS

    function draw(timestamp) {
      if (timestamp - lastTime.current >= interval) {
        const frame = frames.current[frameIndex.current]
        if (frame?.complete && frame.naturalWidth > 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height)
        }
        frameIndex.current = (frameIndex.current + 1) % TOTAL_FRAMES
        lastTime.current = timestamp
      }
      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [loaded])

  if (error) return null

  // Scale down to fit height 180px, keep proportions, overflow width
  const targetH = 180
  const scale = targetH / naturalSize.h
  const scaledW = naturalSize.w * scale

  return (
    <div style={{
      width: '100%',
      height: targetH,
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {!loaded && (
        <div style={{ color: accentColor, opacity: 0.3, fontSize: 12 }}>...</div>
      )}
      <canvas
        ref={canvasRef}
        width={naturalSize.w}
        height={naturalSize.h}
        style={{
          width: scaledW,
          height: targetH,
          flexShrink: 0,
          display: loaded ? 'block' : 'none',
          background: 'transparent',
        }}
      />
      {talking && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
          animation: 'pulse 0.8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
