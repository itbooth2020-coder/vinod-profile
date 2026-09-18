import { useEffect } from 'react'

const REVEAL = '.section h2, .card, .timeline__item, .snapshot__row, .stats__item'

// Scroll-reveal, cursor spotlight and 3D tilt for cards.
export default function useSiteEffects() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = document.querySelectorAll(REVEAL)
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 },
    )
    els.forEach((el, i) => {
      el.classList.add('reveal')
      el.style.setProperty('--d', `${(i % 4) * 70}ms`)
      if (reduce) el.classList.add('in')
      else io.observe(el)
    })

    const onMove = (e) => {
      const card = e.target.closest?.('.card')
      if (!card) return
      const r = card.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      card.style.setProperty('--mx', `${x}px`)
      card.style.setProperty('--my', `${y}px`)
      if (!reduce) {
        card.style.setProperty('--ry', `${(x / r.width - 0.5) * 6}deg`)
        card.style.setProperty('--rx', `${(0.5 - y / r.height) * 6}deg`)
      }
    }
    const onLeave = (e) => {
      const card = e.target.closest?.('.card')
      card?.style.setProperty('--rx', '0deg')
      card?.style.setProperty('--ry', '0deg')
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseout', onLeave)
    return () => {
      io.disconnect()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseout', onLeave)
    }
  }, [])
}
