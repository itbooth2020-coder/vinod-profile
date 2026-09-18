import { useEffect, useRef } from 'react'

export default function ScrollProgress() {
  const bar = useRef(null)
  useEffect(() => {
    const update = () => {
      const h = document.documentElement
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return <div className="progress" ref={bar} aria-hidden="true" />
}
