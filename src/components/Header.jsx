import { useEffect, useRef, useState } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import ThemePicker from './ThemePicker.jsx'
import MotionToggle from './MotionToggle.jsx'

// Same order as the sections in App.jsx.
const links = [
  { href: '#lead', label: 'leadership' },
  { href: '#projects', label: 'projects' },
  { href: '#experience', label: 'experience' },
  { href: '#fit', label: 'role fit' },
  { href: '#skills', label: 'skills' },
  { href: '#blogs', label: 'writing' },
  { href: '#contact', label: 'contact' },
]

// Opens VINCE's panel (Vince.jsx queues the event until the panel has loaded). data-vince-trigger:
// VINCE's outside-click close ignores it, so the press doesn't close him as it opens him.
const openVince = () => window.dispatchEvent(new Event('vince:open'))

export default function Header() {
  const ref = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  // The header is sticky (styles.css); is-scrolled gives it a bottom edge once the page moves under it.
  // --header-h is its measured height, so anchor jumps, scrollIntoView and focused elements stop below
  // it (html scroll-padding-top). styles.css has per-breakpoint fallbacks for the no-JS page.
  // The block in view: the one crossing a line a third of the way down the space below the header, or
  // the last one once the page is scrolled to the end. Every top-level block of <main> counts, so over
  // one that isn't in the nav (Impact, the domain graph, Credentials) no pill is current (UX-017);
  // over a nav section, its pill gets aria-current. Blocks are looked up each time (role fit swaps its
  // placeholder) and checked at most once a frame, only while scrolling.
  useEffect(() => {
    const root = document.documentElement
    const ids = links.map((l) => l.href.slice(1))
    let frame = 0
    const update = () => {
      frame = 0
      setScrolled(window.scrollY > 0)
      const top = ref.current?.getBoundingClientRect().bottom || 0
      const line = top + (window.innerHeight - top) / 3
      const atEnd = window.innerHeight + window.scrollY >= root.scrollHeight - 2
      const blocks = new Set([...document.querySelectorAll('#main > *'), ...ids.map((id) => document.getElementById(id))])
      blocks.delete(null)
      const inOrder = [...blocks].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      let current = ''
      for (const el of inOrder) {
        if (!el.getClientRects().length) continue
        const r = el.getBoundingClientRect()
        if (atEnd ? r.top < window.innerHeight : r.top <= line && r.bottom > top) current = el.id
      }
      setActive(ids.includes(current) ? current : '')
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const measure = () => {
      const h = ref.current?.getBoundingClientRect().height
      if (h) root.style.setProperty('--header-h', `${Math.ceil(h)}px`)
      onScroll()
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (ro && ref.current) ro.observe(ref.current)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      ro?.disconnect()
    }
  }, [])

  return (
    <header className={scrolled ? 'header is-scrolled' : 'header'} ref={ref}>
      <div className="wrap header__inner">
        {/* A focused pill scrolls into view inside the sideways-scrolling row (UX-015); "nearest" leaves
            the page where it is (the header is sticky and its controls count as in view, styles.css). */}
        <nav aria-label="Sections" className="nav" onFocus={(e) => e.target.scrollIntoView({ block: 'nearest', inline: 'nearest' })}>
          {links.map((l) => (
            <a key={l.href} href={l.href} aria-current={active === l.href.slice(1) ? 'true' : undefined}>
              {l.label}
            </a>
          ))}
          {/* After the sections: an action, not a place on the page. On phones CSS shows it first in the
              scrolling row, so it's visible without swiping (UX-012). Hidden without JavaScript (index.html). */}
          <button type="button" className="nav__vince" onClick={openVince} aria-haspopup="dialog" data-vince-trigger>
            ask VINCE
          </button>
        </nav>
        <div className="header__tools">
          <ThemePicker />
          <MotionToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
