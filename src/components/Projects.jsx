import { useEffect, useRef, useState } from 'react'
import { projects, otherProjects } from '../data.js'
import CaseStudy from './CaseStudy.jsx'

const slugOf = (p) => p.media.split('/').pop() // e.g. #case-darwin
const has = (s) => Boolean(s && s.trim())

// A case study is offered only when it adds something beyond the card's own text.
const addsToCard = (p) => {
  const cs = p.caseStudy
  if (!cs) return false
  const beyond = (s) => has(s) && !p.text.includes(s.trim())
  return beyond(cs.context) || beyond(cs.role) || [...(cs.approach || []), ...(cs.outcomes || [])].some(beyond) || cs.metrics?.length > 0
}
const cases = projects.filter(addsToCard)
const caseFromHash = () => {
  const m = window.location.hash.match(/^#case-(.+)$/)
  return m ? cases.find((p) => slugOf(p) === decodeURIComponent(m[1])) : undefined
}

export default function Projects() {
  const dialogRef = useRef(null)
  const openers = useRef({})
  const [current, setCurrent] = useState(null)
  const currentRef = useRef(null)
  currentRef.current = current

  // Shareable deep links: #case-<slug> opens that case study on load and on hashchange.
  useEffect(() => {
    const sync = () => {
      const p = caseFromHash()
      if (p) {
        // Brief mode hides this section (and the dialog with it), so leave it first (App.jsx).
        // Deferred: on load this runs before App's effect has added its listener.
        if (document.documentElement.dataset.mode === 'brief') setTimeout(() => window.dispatchEvent(new Event('brief:exit')))
        setCurrent(p)
      } else if (currentRef.current && window.location.hash) {
        dialogRef.current?.close() // navigated elsewhere, e.g. #fit
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // Open once the content has rendered, so showModal() focuses its first control.
  useEffect(() => {
    if (!current) return
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    const hash = `#case-${slugOf(current)}`
    if (window.location.hash !== hash) history.replaceState(history.state, '', hash)
  }, [current])

  const close = () => dialogRef.current.close()
  const onClose = () => {
    const p = currentRef.current
    setCurrent(null)
    window.dispatchEvent(new Event('vince:stop'))
    if (window.location.hash.startsWith('#case-')) {
      history.replaceState(history.state, '', window.location.pathname + window.location.search)
    }
    // Back to the card that opened it, unless the visitor navigated elsewhere (e.g. #fit focuses its heading).
    if (p && !window.location.hash) openers.current[slugOf(p)]?.focus()
  }

  return (
    <section id="projects" aria-labelledby="projects-h">
      <h2 className="sec" id="projects-h">Key projects</h2>
      <div className="grid">
        {projects.map((p) => {
          const open = cases.includes(p)
          return (
            <article key={p.name} className={`card mc${open ? ' mc--clickable' : ''}`}>
              <span className="tag">{p.tag}</span>
              <h3>{p.name}</h3>
              <p>{p.text}</p>
              {open && (
                <button
                  type="button"
                  className="case-open"
                  ref={(el) => { openers.current[slugOf(p)] = el }}
                  onClick={() => setCurrent(p)}
                  aria-haspopup="dialog"
                >
                  Read case study<span className="sr-only">: {p.name}</span> <span aria-hidden="true">→</span>
                </button>
              )}
            </article>
          )
        })}
      </div>
      <p className="more">
        <span>Also:</span> {otherProjects.join(' · ')}
      </p>

      <dialog
        ref={dialogRef}
        className="gdialog gdialog--case"
        aria-labelledby="case-title"
        onClose={onClose}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        {current && <CaseStudy key={slugOf(current)} project={current} titleId="case-title" onClose={close} />}
      </dialog>
    </section>
  )
}
