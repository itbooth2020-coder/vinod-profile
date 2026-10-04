import { useEffect, useState } from 'react'
import { profile, personal, quotes, experience, education } from '../data.js'

// Whole years since birthDate ('YYYY' or 'YYYY-MM-DD'); null while it isn't set.
function ageFrom(birthDate) {
  const m = String(birthDate).match(/^(\d{4})(?:-(\d{2})-(\d{2}))?$/)
  if (!m) return null
  const now = new Date()
  const [y, mo = 1, d = 1] = [Number(m[1]), Number(m[2] || 1), Number(m[3] || 1)]
  const hadBirthday = now.getMonth() + 1 > mo || (now.getMonth() + 1 === mo && now.getDate() >= d)
  return now.getFullYear() - y - (hadBirthday ? 0 : 1)
}

const pickQuote = (not) => {
  const pool = quotes.filter((q) => q !== not)
  return pool[Math.floor(Math.random() * pool.length)]
}

const QUOTE_MS = 8000

// Swaps the quote every QUOTE_MS. The timer restarts on every change (including "Another quote"),
// pauses while paused is true, and stays off for visitors who prefer reduced motion.
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
  const [paused, setPaused] = useState(false)
  const [quote, nextQuote] = useRotatingQuote(paused)
  const age = ageFrom(personal.birthDate)
  const current = experience[0]

  const facts = [
    age !== null && `${age} years`,
    personal.location.split(',')[0],
    personal.nationality,
  ].filter(Boolean)

  const details = [
    age !== null && ['Age', `${age}`],
    ['Nationality', personal.nationality],
    ['Location', personal.location],
    ['Current role', `${current.role}, ${current.company} (since ${current.period.split('–')[0].trim()})`],
    ['Experience', '14+ years in software engineering and engineering leadership'],
    ['Education', education[0].split(' — ')[0] + ', ' + education[1].split(' — ')[0]],
    ['Languages', personal.languages],
  ].filter(Boolean)

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
          <button type="button" className="pdialog__shuffle" onClick={nextQuote}>
            ↻ <span>Another quote</span>
          </button>
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
          <a className="btn" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Resume (PDF)</a>
        </div>
      </div>
    </div>
  )
}
