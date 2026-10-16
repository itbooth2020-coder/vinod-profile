import { useState } from 'react'
import { profile } from '../data.js'
import Avatar from './Avatar.jsx'
import Availability from './Availability.jsx'

// Simple-icons style glyphs (24x24), drawn with currentColor. `sr` is the accessible name; the
// footer lists the same four profiles.
const SOCIAL = [
  {
    href: profile.linkedin,
    label: 'LinkedIn',
    sr: 'LinkedIn (opens in a new tab)',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    href: profile.github,
    label: 'GitHub',
    sr: 'GitHub (opens in a new tab)',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    href: profile.facebook,
    label: 'Facebook',
    sr: 'Facebook (opens in a new tab)',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    href: profile.x,
    label: 'X',
    sr: 'X (Twitter, opens in a new tab)',
    path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  },
]

export default function Hero({ brief, onToggleBrief, toggleRef }) {
  // Phones clamp the pitch to three lines (styles.css); "Read more" shows all of it. The full text is
  // always in the page, so screen readers and print get it either way.
  const [more, setMore] = useState(false)
  return (
    <section id="top" className="hero">
      <div className="hero__text">
        <div className="hero__top">
          {/* Switches between the full profile and the brief. The label text is the accessible name. */}
          <button ref={toggleRef} type="button" role="switch" className="brief-switch" aria-checked={brief} onClick={onToggleBrief}>
            <span className="brief-switch__label">30-second brief</span>
            <span className="brief-switch__track" aria-hidden="true">
              <span className="brief-switch__thumb">
                <svg viewBox="0 0 12 12" width="10" height="10" focusable="false">
                  <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
          </button>
        </div>
        <h1>{profile.firstName} <em>{profile.lastName}</em></h1>
        <p className="headline">{profile.headline}</p>
        <p id="hero-pitch" className={`lede${more ? ' lede--open' : ''}`}>{profile.pitch}</p>
        <button type="button" className="lede__more" aria-expanded={more} aria-controls="hero-pitch" onClick={() => setMore((m) => !m)}>
          {more ? 'Show less' : 'Read more'}
        </button>
        <Availability />
        {/* VINCE stays one click away in the floating launcher; the console is in the header nav ("ask", or "ask AI" with the live agent). */}
        <div className="actions">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>Email</a>
        </div>
        <ul className="social" aria-label="Social profiles">
          {SOCIAL.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path d={s.path} fill="currentColor" />
                </svg>
                <span className="sr-only">{s.sr}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="hero__photo">
        <Avatar priority sizes="(min-width: 900px) 200px, (max-width: 600px) 60px, 76px" />
      </div>
    </section>
  )
}
