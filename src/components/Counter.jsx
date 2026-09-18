import { useEffect, useRef, useState } from 'react'

export default function Counter({ value }) {
  const match = String(value).match(/^(\d+)(.*)$/)
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

  return <span ref={ref}>{target === null ? value : `${n}${match[2]}`}</span>
}
