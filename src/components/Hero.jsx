import { profile } from '../data.js'
import Avatar from './Avatar.jsx'
import Typing from './Typing.jsx'

// Simple-icons style glyphs (24x24), drawn with currentColor.
const SOCIAL = [
  {
    href: profile.linkedin,
    label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    href: profile.facebook,
    label: 'Facebook',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    href: profile.x,
    label: 'X (Twitter)',
    path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  },
]

export default function Hero({ brief, onToggleBrief, toggleRef }) {
  return (
    <section id="top" className="hero">
      <div className="hero__text">
        <div className="hero__top">
          <p className="badge">{profile.role} &middot; {profile.company}</p>
          <button ref={toggleRef} type="button" className="brief-toggle" aria-pressed={brief} onClick={onToggleBrief}>
            <span className="brief-toggle__dot" aria-hidden="true" /> 30-second brief
          </button>
        </div>
        <h1>{profile.firstName} <em>{profile.lastName}</em></h1>
        <p className="headline">{profile.headline}</p>
        <p className="lede">{profile.tagline}</p>
        <Typing words={profile.domains} />
        <div className="actions">
          <a className="btn btn--primary" href="#console">Ask the profile agent</a>
          <button type="button" className="btn btn--vince" data-vince-trigger onClick={() => window.dispatchEvent(new Event('vince:open'))}>
            <span className="btn__orb" aria-hidden="true" /> Talk to VINCE
          </button>
          <a className="btn" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Download resume</a>
        </div>
        <ul className="social" aria-label="Social profiles">
          {SOCIAL.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path d={s.path} fill="currentColor" />
                </svg>
                <span className="sr-only">{s.label} (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="hero__photo">
        <Avatar priority />
      </div>
    </section>
  )
}
