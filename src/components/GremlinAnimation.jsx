import { useEffect, useRef, useState } from 'react'

const TOTAL_FRAMES = 50
const FPS = 24

const ROLE_PREFIX = {
  chef: 'Chef/Chef00001',
  accountant: 'Accountant/Accountant00001',
  trainer: 'Trainer/Trainer00001',
  secretary: 'Secretary/Secretary00001',
}

const SUPABASE_URL = 'https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/gremlins-anim'

export default function GremlinAnimation({ role, accentColor, talking, size = 120 }) {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    frames.current = []
    frameIndex.current = 0
    setLoaded(false)
    setError(false)

    const prefix = ROLE_PREFIX[role]
    if (!prefix) { setError(true); return }

    let loadedCount = 0
    let errorCount = 0
    const total = TOTAL_FRAMES

    for (let i = 0; i < total; i++) {
      const img = new Image()
      const num = String(i).padStart(5, '0')
      img.src = `${SUPABASE_URL}/${prefix}_${num}.png`
      img.onload = () => {
        loadedCount++
        if (loadedCount + errorCount === total) {
          if (loadedCount > 0) setLoaded(true)
          else setError(true)
        }
      }
      img.onerror = () => {
        errorCount++
        if (loadedCount + errorCount === total) {
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
    const ctx = canvas.getContext('2d')
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

  if (error) return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: '#0a0908',
      border: `3px solid ${accentColor}`,
      boxShadow: `0 0 12px ${accentColor}60`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, flexShrink: 0
    }}>
      👾
    </div>
  )

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `3px solid ${accentColor}`,
      boxShadow: talking
        ? `0 0 20px ${accentColor}, 0 0 40px ${accentColor}60, inset 0 0 20px ${accentColor}20`
        : `0 0 12px ${accentColor}60, 0 0 30px ${accentColor}20`,
      overflow: 'hidden',
      position: 'relative',
      transition: 'box-shadow 0.3s',
      background: '#0a0908',
      flexShrink: 0,
    }}>
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accentColor, fontSize: 10, opacity: 0.5
        }}>...</div>
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', display: loaded ? 'block' : 'none' }}
      />
      {/* Glass overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.12) 0%, transparent 60%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      {/* Talking pulse */}
      {talking && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          animation: 'pulse 0.8s ease-in-out infinite',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
      )}
    </div>
  )
}
