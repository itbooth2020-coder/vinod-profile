import { useEffect, useState } from 'react'
import { profile, personal, quotes, experience, education } from '../data.js'
import useMotionPaused from '../hooks/useMotion.js'

const pickQuote = (not) => {
  const pool = quotes.filter((q) => q !== not)
  return pool[Math.floor(Math.random() * pool.length)]
}

const QUOTE_MS = 8000

// Swaps the quote every QUOTE_MS. The timer restarts on every change (including "Another quote"),
// pauses while paused is true, and stays off for visitors who prefer reduced motion or who paused
// animations (header toggle, or "Pause quotes" here, since the header is behind the modal).
function useRotatingQuote(paused) {
  const [quote, setQuote] = useState(() => pickQuote())
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => setQuote((q) => pickQuote(q)), QUOTE_MS)
    return () => clearTimeout(id)
  }, [quote, paused])
  return [quote, () => setQuote((q) => pickQuote(q))]
}

// Contents of the profile dialog: large photo with overlaid facts and a quote, details on the right.
// Rendered only while the dialog is open, so the large photo isn't downloaded until needed.
export default function ProfileDialog({ titleId }) {
  const [paused, setPaused] = useState(false) // hover or focus on the caption
  const [stopped, setStopped] = useState(false) // the Pause quotes button
  const motionPaused = useMotionPaused()
  const [quote, nextQuote] = useRotatingQuote(paused || stopped || motionPaused)
  const current = experience[0]

  // No age or date of birth: Vinod asked for them never to be shown.
  const facts = [personal.location.split(',')[0], personal.nationality]

  const details = [
    ['Nationality', personal.nationality],
    ['Location', personal.location],
    ['Current role', `${current.role}, ${current.company} (since ${current.period.split('–')[0].trim()})`],
    ['Experience', '14+ years in software engineering and engineering leadership'],
    ['Education', education[0].split(' — ')[0] + ', ' + education[1].split(' — ')[0]],
    ['Languages', personal.languages],
  ]

  return (
    <div className="pdialog">
      <figure className="pdialog__photo">
        <img src={`${import.meta.env.BASE_URL}${personal.photo}`} alt={`Formal portrait of ${profile.name}`} />
        <figcaption
          className="pdialog__overlay"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <p className="pdialog__name">{profile.name}</p>
          <ul className="pdialog__facts" aria-label="Quick facts">
            {facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <blockquote key={quote.text} className="pdialog__quote">
            <p>“{quote.text}”</p>
            <footer>— {quote.by}</footer>
          </blockquote>
          <div className="pdialog__qtools">
            <button type="button" className="pdialog__shuffle" onClick={nextQuote}>
              <span aria-hidden="true">↻</span> Another quote
            </button>
            {!motionPaused && (
              <button type="button" className="pdialog__shuffle" aria-pressed={stopped} onClick={() => setStopped((v) => !v)}>
                Pause quotes
              </button>
            )}
          </div>
        </figcaption>
      </figure>

      <div className="pdialog__info">
        <h2 id={titleId} className="pdialog__title">{profile.name}</h2>
        <p className="pdialog__headline">{profile.headline}</p>
        <dl className="pdialog__details">
          {details.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="actions">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>Email</a>
          <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>        </div>
      </div>
    </div>
  )
}
