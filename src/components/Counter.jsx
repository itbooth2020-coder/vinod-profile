import { useEffect, useRef, useState } from 'react'

// Counts up a leading number ('35+', '100%'). Values with more digits after it ('3 wk → 5 days')
// aren't counted, so they never show a misleading partial figure. `sr` replaces the visible text
// for screen readers when the value doesn't read well as written.
export default function Counter({ value, sr }) {
  const match = String(value).match(/^(\d+)(\D*)$/)
  const target = match ? Number(match[1]) : null
  const [n, setN] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (target === null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target)
      return
    }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - start) / 1400)
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [target])

  const shown = target === null ? value : `${n}${match[2]}`
  if (!sr) return <span ref={ref}>{shown}</span>
  return (
    <span ref={ref}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{sr}</span>
    </span>
  )
}
