import { useEffect, useRef, useState } from 'react'

// Counts up a leading number ('35+', '100%'). Values with more digits after it ('3 wk → 5 days')
// aren't counted, so they never show a misleading partial figure. `sr` replaces the visible text
// for screen readers when the value doesn't read well as written.
// Only the aria-hidden visual copy animates: screen readers always get the final value, print shows
// it (styles.css .counter), and a hidden copy of it reserves the width so counting doesn't shift layout.
export default function Counter({ value, sr }) {
  const match = String(value).match(/^(\d+)(\D*)$/)
  const target = match ? Number(match[1]) : null
  const [n, setN] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (target === null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setN(target)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - start) / 1400)
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
        raf = p < 1 ? requestAnimationFrame(step) : 0
      }
      raf = requestAnimationFrame(step)
    })
    io.observe(ref.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target])

  const shown = target === null ? value : `${n}${match[2]}`
  return (
    <span ref={ref} className="counter">
      <span className="counter__final" aria-hidden="true">{value}</span>
      <span className="counter__live" aria-hidden="true">{shown}</span>
      <span className="sr-only">{sr || value}</span>
    </span>
  )
}
