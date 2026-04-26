import { useEffect, useRef } from 'react'

const TOTAL_FRAMES = 84
const FPS = 24

export default function BgAnimation() {
  const canvasRef = useRef(null)
  const frames = useRef([])
  const frameIndex = useRef(0)
  const animRef = useRef(null)
  const lastTime = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let loaded = 0

    // Preload all frames
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      const num = String(i).padStart(5, '0')
      img.src = `https://gljpqbsslkunuvzfdshd.supabase.co/storage/v1/object/public/bg-animation/01_${num}.png`
      img.onload = () => {
        loaded++
        if (loaded === TOTAL_FRAMES) startAnimation()
      }
      img.onerror = () => { loaded++; if (loaded === TOTAL_FRAMES) startAnimation() }
      frames.current[i - 1] = img
    }

    function startAnimation() {
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
    }

    // Resize canvas to match container
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        maxWidth: 480,
        margin: '0 auto',
        opacity: 0.8,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
