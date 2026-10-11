import { useEffect, useState } from 'react'
import { experience, graphProjects } from '../data.js'
import { mediaById } from '../agent/media.js'
import { explainNode } from '../agent/vince.js'
import { unlockSpeech } from '../agent/voice.js'
import MediaTile from './MediaTile.jsx'

// Contents of the case-study dialog (Projects.jsx owns the <dialog>). Only shows what the
// project's `caseStudy` in data.js states; empty sections are left out.
const lead = (name) => name.split(' – ')[0]
const graphFor = (p) => graphProjects.find((g) => lead(g.name) === lead(p.name))

// Approach items may start with a short label ("Architecture: ..."), shown in bold.
function ApproachItem({ text }) {
  const m = text.match(/^([^:.]{1,40}):\s+(.*)$/)
  return <li>{m ? <><b>{m[1]}:</b> {m[2]}</> : text}</li>
}

const fmt = (n, unit) => `${n}${unit === '%' ? '%' : ` ${unit}`}`
const signed = (n, unit) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n), unit)}`

function Metric({ m }) {
  if (typeof m.change === 'number') {
    return (
      <li className="case__metric">
        <p className="case__mlabel">
          <span>{m.label}</span>
          <b className="case__delta">{signed(m.change, m.unit)}</b>
        </p>
        <div className="case__track" aria-hidden="true">
          <span className="case__bar case__bar--after" style={{ '--w': Math.min(Math.abs(m.change), 100) / 100 }} />
        </div>
        <p className="case__mnote">
          Relative change &middot; {m.better === 'lower' ? 'lower is better' : 'higher is better'}
        </p>
      </li>
    )
  }
  const max = Math.max(m.before, m.after) || 1
  return (
    <li className="case__metric">
      <p className="case__mlabel"><span>{m.label}</span></p>
      <dl className="case__pair">
        {[['Before', m.before], ['After', m.after]].map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              <span className="case__track" aria-hidden="true">
                <span className={`case__bar case__bar--${k.toLowerCase()}`} style={{ '--w': v / max }} />
              </span>
              <span className="case__val">{fmt(v, m.unit)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="case__mnote">{m.better === 'lower' ? 'Lower is better' : 'Higher is better'}</p>
    </li>
  )
}

export default function CaseStudy({ project: p, titleId, onClose }) {
  const cs = p.caseStudy
  const job = cs.company ? experience.find((e) => e.company === cs.company) : null
  const gp = graphFor(p)
  const logos = [mediaById[p.media], job && mediaById[job.media]].filter(Boolean)
  const metrics = (cs.metrics || []).filter((m) => typeof m.change === 'number' || (typeof m.before === 'number' && typeof m.after === 'number'))
  const [explained, setExplained] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const onMode = (e) => setSpeaking(e.detail === 'speaking')
    window.addEventListener('vince:mode', onMode)
    return () => window.removeEventListener('vince:mode', onMode)
  }, [])

  // VINCE explains the project as a domain-graph project node; his panel sits behind the modal,
  // so the explanation is also shown here as a caption (same as the domain graph dialog).
  const node = gp && { type: 'project', label: gp.short, project: gp }
  const askVince = () => {
    unlockSpeech()
    setExplained(true)
    window.dispatchEvent(new CustomEvent('vince:explain', { detail: node }))
  }

  return (
    <article className="case">
      <header className="card__head case__head">
        <div className="case__title">
          <span className="tag">{p.tag}</span>
          <h2 id={titleId}>{p.name}</h2>
          {(job || cs.client) && (
            <p className="case__meta">
              {cs.client && <>Client: {cs.client}{job && <> &middot; </>}</>}
              {job && <>{job.company} &middot; {job.role} &middot; {job.period}</>}
            </p>
          )}
        </div>
        <div className="gdialog__tools">
          {node && (
            <button type="button" className="askvince__btn" data-vince-trigger onClick={askVince} aria-label={`Ask VINCE about ${p.name}`}>
              <span className="btn__orb" aria-hidden="true" />
              Ask VINCE<span className="askvince__label">&nbsp;about this project</span>
            </button>
          )}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close case study">
            <span aria-hidden="true">✕</span> Close
          </button>
        </div>
      </header>

      {explained && (
        <div className="askvince__caption" role="status">
          <p><b>VINCE{speaking ? ' · speaking' : ''}:</b> {explainNode(node)}</p>
          {speaking && (
            <button type="button" className="icon-btn" data-vince-trigger onClick={() => window.dispatchEvent(new Event('vince:stop'))}>
              <span aria-hidden="true">■</span> Stop
            </button>
          )}
        </div>
      )}

      <div className="case__body">
        {cs.context !== p.text && <p className="case__summary">{p.text}</p>}

        {cs.context && (
          <section className="case__sec" aria-labelledby={`${titleId}-ctx`}>
            <h3 id={`${titleId}-ctx`}>Context</h3>
            <p>{cs.context}</p>
          </section>
        )}
        {cs.role && (
          <section className="case__sec" aria-labelledby={`${titleId}-role`}>
            <h3 id={`${titleId}-role`}>My role</h3>
            <p>{cs.role}</p>
          </section>
        )}
        {cs.approach?.length > 0 && (
          <section className="case__sec" aria-labelledby={`${titleId}-appr`}>
            <h3 id={`${titleId}-appr`}>Approach</h3>
            <ul>{cs.approach.map((a) => <ApproachItem key={a} text={a} />)}</ul>
          </section>
        )}
        {cs.outcomes?.length > 0 && (
          <section className="case__sec" aria-labelledby={`${titleId}-out`}>
            <h3 id={`${titleId}-out`}>Outcome</h3>
            <ul>{cs.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
          </section>
        )}
        {metrics.length > 0 && (
          <section className="case__sec" aria-labelledby={`${titleId}-imp`}>
            <h3 id={`${titleId}-imp`}>Impact</h3>
            <ul className="case__metrics">{metrics.map((m) => <Metric key={m.label} m={m} />)}</ul>
          </section>
        )}
        {(gp?.tech.length > 0 || logos.length > 0) && (
          <section className="case__sec" aria-labelledby={`${titleId}-tech`}>
            <h3 id={`${titleId}-tech`}>Technology</h3>
            {gp?.tech.length > 0 && <ul className="tags">{gp.tech.map((t) => <li key={t}>{t}</li>)}</ul>}
            {logos.length > 0 && (
              <div className="case__logos">
                {logos.map((m) => <MediaTile key={m.id} item={m} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  )
}
