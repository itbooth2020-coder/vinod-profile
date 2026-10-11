import { useEffect, useRef } from 'react'
import { profile, profileCard, stats, projects } from '../data.js'
import Avatar from './Avatar.jsx'

// "30-second brief": a one-screen summary for recruiters. Shown while <html data-mode="brief">
// (see App.jsx); styles.css hides the rest of the page so nothing else unmounts.
const SIGNALS = ['experience', 'team scale', 'company', 'previously', 'location']
const signals = profileCard.filter(([k]) => SIGNALS.includes(k))
const topProjects = projects.slice(0, 3)

export default function Brief({ headingRef, onClose }) {
  // Escape leaves brief mode, unless an open dialog, the theme panel or VINCE owns the key.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open], #theme-panel')) return
      const inside = (el) => el instanceof Element && el.closest('.vince, [role="dialog"]')
      if (inside(e.target) || inside(document.activeElement)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // A click or tap on blank space outside the card leaves brief mode (like VINCE's panel).
  // Eligibility is decided on pointerdown (capture), but the close waits for pointerup: a touch
  // scroll fires pointercancel, and a press that drifts more than ~10px (a drag or text
  // selection) is ignored. Interactive elements, the card, dialogs, VINCE and the theme
  // picker keep their own behaviour. Focus stays where the visitor clicked.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    let start = null
    const ignored = (el) => !(el instanceof Element) || el.closest(
      '#brief, a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], ' +
      '[tabindex]:not([tabindex="-1"]), dialog, [role="dialog"], .vince, .vince-launch, .vince-dock, ' +
      '.vince-backdrop, [data-vince-trigger], #theme-panel, [aria-controls="theme-panel"]',
    )
    const onPointerDown = (e) => {
      start = null
      if (e.button !== 0 || !e.isPrimary) return
      const root = document.documentElement
      if (e.clientX >= root.clientWidth || e.clientY >= root.clientHeight) return // page scrollbar
      if (ignored(e.target)) return
      // An open dialog, theme panel or VINCE panel closes on its own outside press; leave the brief be.
      if (document.querySelector('dialog[open], #theme-panel, .vince--normal')) return
      start = { x: e.clientX, y: e.clientY }
    }
    const onCancel = () => { start = null }
    // Close on pointerup, not click: iOS Safari doesn't fire click for taps on blank,
    // non-clickable areas. The full page renders under the pointer as the brief closes, so the
    // click that follows is swallowed once, so it can't land on a link or button that just appeared.
    const onPointerUp = (e) => {
      const from = start
      start = null
      if (!from || e.button !== 0 || !e.isPrimary || ignored(e.target)) return
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > 10) return
      const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation() }
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, true), 400)
      closeRef.current({ keepFocus: true })
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointercancel', onCancel, true)
    document.addEventListener('pointerup', onPointerUp, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointercancel', onCancel, true)
      document.removeEventListener('pointerup', onPointerUp, true)
    }
  }, [])

  return (
    <section id="brief" className="card brief" aria-labelledby="brief-h">
      <div className="brief__bar">
        <button type="button" className="brief__back" onClick={() => onClose()}>
          <span aria-hidden="true">&larr;</span> Back to full profile
        </button>
        <button type="button" className="icon-btn brief__x" onClick={() => onClose()} aria-label="Close the 30-second brief" title="Close">
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="brief__head">
        <Avatar />
        <div>
          <p className="brief__eyebrow" aria-hidden="true">30-second brief</p>
          <h1 id="brief-h" ref={headingRef} tabIndex={-1}>
            <span className="sr-only">30-second brief: </span>
            {profile.name}
          </h1>
          <p className="brief__role">{profile.role} &middot; {profile.company}</p>
          <p className="brief__headline">{profile.headline}</p>
        </div>
      </div>

      <dl className="brief__signals">
        {signals.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="brief__cols">
        <div>
          <h2 className="brief__label">Proof points</h2>
          <dl className="brief__stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.value}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="brief__label">Top projects</h2>
          <ul className="brief__projects">
            {topProjects.map((p) => (
              <li key={p.name}>
                <span className="brief__pname">{p.name}</span>
                <span className="tag">{p.tag}</span>
              </li>
            ))}
          </ul>
          <h2 className="brief__label">Core domains</h2>
          <ul className="tags">
            {profile.domains.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      </div>

      <div className="actions">
        <a className="btn btn--primary" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Download resume</a>
        {/* Leaves brief mode via App's in-page link handling; RoleFit then focuses its heading. */}
        <a className="btn" href="#fit">Check role fit</a>
        <a className="btn" href={`mailto:${profile.email}`}>Email</a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button type="button" className="btn brief__close" onClick={() => onClose()}>Back to full profile</button>
      </div>
      <p className="brief__print">{profile.email} &middot; {profile.linkedin.replace(/^https:\/\/(www\.)?/, '')}</p>
    </section>
  )
}
