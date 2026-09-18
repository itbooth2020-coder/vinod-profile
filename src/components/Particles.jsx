import { useEffect, useRef } from 'react'

export default function Particles() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const c = ref.current
    const ctx = c.getContext('2d')
    let w, h, raf
    let pts = []
    const resize = () => {
      w = c.width = c.offsetWidth
      h = c.height = c.offsetHeight
      const n = Math.min(70, Math.floor((w * h) / 16000))
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      pts.forEach((p, i) => {
        p.x = (p.x + p.vx + w) % w
        p.y = (p.y + p.vy + h) % h
        ctx.fillStyle = 'rgba(159,192,255,0.7)'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, 6.283)
        ctx.fill()
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(p.x - pts[j].x, p.y - pts[j].y)
          if (d < 120) {
            ctx.strokeStyle = `rgba(159,192,255,${0.18 * (1 - d / 120)})`
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      })
      raf = requestAnimationFrame(draw)
    }
    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="particles" aria-hidden="true" />
}
