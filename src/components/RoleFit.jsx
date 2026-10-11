import { useEffect, useRef, useState } from 'react'
import { profile } from '../data.js'
import { matchRole, fitSummaryText, availabilityNote, SAMPLE_JD, MIN_WORDS } from '../agent/roleFit.js'

// Role-fit matcher: a recruiter pastes a job description and sees which requirements the profile
// backs with evidence, related experience, and what isn't evident. Runs entirely in the browser.
const resumeHref = `${import.meta.env.BASE_URL}${profile.resume}`
const FIRST = profile.firstName.split(' ')[0]

export default function RoleFit() {
  const [jd, setJd] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState('')
  const headingRef = useRef(null)
  const inputRef = useRef(null)

  // Re-check as the visitor types or pastes.
  useEffect(() => {
    const id = setTimeout(() => setResult(jd.trim() ? matchRole(jd) : null), 300)
    return () => clearTimeout(id)
  }, [jd])

  // Arriving via #fit (header nav, the brief's "Check role fit") moves focus to the heading.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#fit') headingRef.current?.focus({ preventScroll: true })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(''), 3000)
    return () => clearTimeout(id)
  }, [copied])

  const check = (text = jd) => setResult(text.trim() ? matchRole(text) : null)
  const clear = () => {
    setJd('')
    setResult(null)
    inputRef.current?.focus()
  }
  const sample = () => {
    setJd(SAMPLE_JD)
    check(SAMPLE_JD)
  }
  const copy = async () => {
    const text = fitSummaryText(result, new URL(resumeHref, window.location.href).href)
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied summary to the clipboard.')
    } catch {
      setCopied('Copy failed. Select the results and copy them manually.')
    }
  }

  const ready = result && !result.tooShort
  const status = !result
    ? ''
    : result.tooShort
      ? `Paste a bit more of the job description (at least ${MIN_WORDS} words) to check fit.`
      : result.summary

  return (
    <section id="fit" aria-labelledby="fit-h">
      <h2 className="sec fit__h" id="fit-h" ref={headingRef} tabIndex={-1}>Check role fit</h2>
      <p className="fit__intro">
        Paste a job description to see which requirements {FIRST}&rsquo;s experience covers, each backed by lines from his
        roles and projects, and which aren&rsquo;t evident in the profile.
      </p>

      <form className="card fit__form" onSubmit={(e) => { e.preventDefault(); check() }}>
        <label htmlFor="fit-jd" className="fit__label">Paste a job description</label>
        <textarea
          id="fit-jd"
          ref={inputRef}
          rows={8}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          aria-describedby="fit-note"
          placeholder="e.g. Engineering Manager, Mobile Platform: lead a team of engineers across Android, iOS..."
        />
        <p id="fit-note" className="fit__note">Runs in your browser. Nothing is sent or stored.</p>
        <div className="actions">
          <button type="submit" className="btn btn--primary">Check fit</button>
          <button type="button" className="btn" onClick={clear}>Clear</button>
          <button type="button" className="btn" onClick={sample}>Try a sample</button>
        </div>
      </form>

      <div className="fit__results">
        <p className="fit__status" role="status" aria-live="polite">{status}</p>

        {ready && (
          <>
            {availabilityNote() && <p className="fit__avail">Availability: {availabilityNote()}</p>}
            <Coverage result={result} />

            {result.leadership && (
              <div className="card mc fit__lead">
                <h3>Leadership evidence</h3>
                <p>The JD mentions: {result.leadership.signals.join(', ')}.</p>
                <Evidence items={result.leadership.evidence} />
              </div>
            )}

            {result.strong.length > 0 && (
              <div className="fit__group">
                <h3>Matched with evidence <span className="fit__n">({result.strong.length})</span></h3>
                <ul className="fit__list">
                  {result.strong.map((m) => (
                    <li key={m.label}>
                      <details className="card fit__item">
                        <summary>
                          <span className="fit__term">{m.label}</span>
                          <span className="fit__count">{m.total} {m.total === 1 ? 'mention' : 'mentions'}</span>
                        </summary>
                        <Evidence items={m.evidence} />
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.related.length > 0 && (
              <div className="fit__group">
                <h3>Related experience <span className="fit__n">({result.related.length})</span></h3>
                <ul className="fit__list">
                  {result.related.map((r) => (
                    <li key={r.label} className="card fit__rel">
                      <p><span className="fit__term">{r.label}</span> <span className="fit__via">not named in the profile; related: {r.via.join(', ')}</span></p>
                      <Evidence items={r.evidence} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.gaps.length > 0 && (
              <div className="fit__group">
                <h3>Not evident in the profile <span className="fit__n">({result.gaps.length})</span></h3>
                <ul className="tags fit__gaps">
                  {result.gaps.map((g) => <li key={g.label}>{g.label}</li>)}
                </ul>
              </div>
            )}

            <div className="actions fit__actions">
              <button type="button" className="btn" onClick={copy}>Copy summary</button>
              <a className="btn" href={resumeHref} download>Download resume</a>
              <span className="fit__copied" role="status" aria-live="polite">{copied}</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function Evidence({ items }) {
  return (
    <ul className="fit__ev">
      {items.map((e) => (
        <li key={e.text}>
          {e.text} <span className="fit__where">{e.where}</span>
        </li>
      ))}
    </ul>
  )
}

// How the JD's recognised requirements split up. Deliberately not a score.
function Coverage({ result }) {
  const parts = [
    { key: 'strong', label: 'Matched', n: result.strong.length },
    { key: 'related', label: 'Related', n: result.related.length },
    { key: 'gap', label: 'Not evident', n: result.gaps.length },
  ]
  const total = parts.reduce((s, p) => s + p.n, 0)
  if (!total) return <p className="fit__none">No recognised skills or requirements found in this text yet.</p>
  return (
    <div className="fit__cov">
      <p className="fit__covlabel">Requirements found in the JD</p>
      <div className="fit__bar" aria-hidden="true">
        {parts.map((p) => p.n > 0 && <span key={p.key} className={`fit__seg fit__seg--${p.key}`} style={{ flexGrow: p.n }} />)}
      </div>
      <ul className="fit__legend">
        {parts.map((p) => (
          <li key={p.key}><i className={`fit__seg--${p.key}`} aria-hidden="true" /> {p.label}: {p.n}</li>
        ))}
      </ul>
    </div>
  )
}
