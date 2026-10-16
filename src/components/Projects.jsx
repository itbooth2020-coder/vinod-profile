import { useEffect, useRef, useState } from 'react'
import { projects, otherProjects } from '../data.js'
import { importAgain } from '../importAgain.js'

// The case study (and the VINCE helpers it uses) loads on first open, not with the page
// (PERF-FE-002). It is rendered only once loaded, so showModal() can focus its first control.
// If it can't load (tried twice), the dialog says so and offers Retry; the page stays usable (FUNC-014).
let CaseStudy = null
const loadCaseStudy = () => importAgain(() => import('./CaseStudy.jsx')).then((m) => (CaseStudy = m.default))

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
  const [failed, setFailed] = useState(null) // the project whose case study couldn't load
  const [retrying, setRetrying] = useState(false)
  const [fails, setFails] = useState(0) // a Retry that fails too offers a page reload instead
  const currentRef = useRef(null)
  currentRef.current = current || failed
  const openCase = (p) => {
    if (CaseStudy) return setCurrent(p)
    setRetrying(true)
    loadCaseStudy().then(
      () => {
        setFailed(null)
        setCurrent(p)
      },
      () => {
        setFailed(p)
        setFails((n) => n + 1)
      },
    ).finally(() => setRetrying(false))
  }

  // Shareable deep links: #case-<slug> opens that case study on load and on hashchange.
  useEffect(() => {
    const sync = () => {
      const p = caseFromHash()
      if (p) {
        // Brief mode hides this section (and the dialog with it), so leave it first (App.jsx).
        // Deferred: on load this runs before App's effect has added its listener.
        if (document.documentElement.dataset.mode === 'brief') setTimeout(() => window.dispatchEvent(new Event('brief:exit')))
        openCase(p)
      } else if (currentRef.current && window.location.hash) {
        dialogRef.current?.close() // navigated elsewhere, e.g. #fit
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // Open once the content has rendered, so showModal() focuses its first control.
  const shown = current || failed
  useEffect(() => {
    if (!shown) return
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    // Loaded after a Retry: the Retry button is gone, so focus the case study's first control.
    else if (current && !dialog.contains(document.activeElement)) dialog.querySelector('button, [href]')?.focus()
    const hash = `#case-${slugOf(shown)}`
    if (window.location.hash !== hash) history.replaceState(history.state, '', hash)
  }, [current, failed])

  const close = () => dialogRef.current.close()
  const onClose = () => {
    const p = currentRef.current
    setCurrent(null)
    setFailed(null)
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
                  onClick={() => openCase(p)}
                  onPointerEnter={() => loadCaseStudy().catch(() => {})}
                  onFocus={() => loadCaseStudy().catch(() => {})}
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
        {failed && !current && (
          <div className="case-fail">
            <h2 id="case-title">{failed.name}</h2>
            <p>This case study couldn't load. Check your connection and try again.</p>
            <div className="case-fail__actions">
              <button type="button" className="btn btn--primary" onClick={() => (fails >= 2 ? window.location.reload() : !retrying && openCase(failed))} aria-disabled={retrying || undefined}>
                {retrying ? 'Retrying…' : fails >= 2 ? 'Reload page' : 'Retry'}
              </button>
              <button type="button" className="btn" onClick={close}>Close</button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
