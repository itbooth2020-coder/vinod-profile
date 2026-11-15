import { useEffect, useRef } from 'react'
import { stats, highlights } from '../data.js'
import Counter from './Counter.jsx'

// "At a glance" (the manager metrics and highlights): a button beside the hero's Email (Hero.jsx) that
// opens them in a modal dialog. The content is always rendered, inside the closed <dialog>, so the
// prerender and hydration match and the full-page print shows it (styles.css). The counters start
// when the dialog opens (Counter.jsx counts once it's in view; reduced motion shows the final values).
// Deep links: #impact (the old section's anchor, used by VINCE's answers) and #glance open it.
// The button's id is "glance": VINCE's guided tour points to it (agent/vince.js tourSteps).
const HASHES = ['#impact', '#glance']

export default function Impact({ brief }) {
  const dialogRef = useRef(null)
  const openerRef = useRef(null)
  const pending = useRef(false) // a deep link that arrived in brief mode: open once the brief is off
  const returnTo = useRef(null) // what had focus when it opened: the button, or a link (e.g. in VINCE)
  const printing = useRef(false) // reopened non-modally for printing (FUNC-020)

  const open = () => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    returnTo.current = document.activeElement
    dialog.showModal() // focuses the Close button
    dialog.scrollTop = 0
  }
  const close = () => dialogRef.current.close()
  const onClose = () => {
    // The print swap closes and reopens it (below); browsers fire 'close' later, by when it's open again.
    if (printing.current || dialogRef.current?.open) return
    if (HASHES.includes(window.location.hash)) {
      history.replaceState(history.state, '', window.location.pathname + window.location.search)
    }
    // Back to what opened it (FUNC-019): the button, or the link that did (one of VINCE's answers), without
    // scrolling the page. A deep link on load (nothing focused) or a link that has gone returns to the button.
    const back = returnTo.current
    returnTo.current = null
    const target = back && back !== document.body && back.isConnected ? back : openerRef.current
    target?.focus({ preventScroll: true })
    if (document.activeElement !== target) openerRef.current?.focus({ preventScroll: true })
  }

  // Printing with it open (FUNC-020): a modal sits in the top layer, which print CSS can't move, so it
  // printed over the hero. For the print it's reopened non-modally (the print rules in styles.css then
  // place it after the hero, as when closed), and made modal again afterwards.
  useEffect(() => {
    const before = () => {
      const dialog = dialogRef.current
      if (!dialog?.open || printing.current) return
      printing.current = true
      dialog.close()
      dialog.setAttribute('open', '')
    }
    const after = () => {
      const dialog = dialogRef.current
      if (!printing.current || !dialog) return
      dialog.close()
      dialog.showModal()
      printing.current = false
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  // Brief mode hides the hero's text (and this dialog with it), so a deep link leaves it first (App.jsx)
  // and opens the dialog once the page is back.
  useEffect(() => {
    if (brief || !pending.current) return
    pending.current = false
    setTimeout(open)
  }, [brief])

  useEffect(() => {
    const sync = () => {
      if (!HASHES.includes(window.location.hash)) return
      if (document.documentElement.dataset.mode === 'brief') {
        pending.current = true
        // Deferred: on load this runs before App's effect has added its listener.
        setTimeout(() => window.dispatchEvent(new Event('brief:exit')))
      } else open()
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return (
    <>
      <button ref={openerRef} id="glance" type="button" className="btn" onClick={open} aria-haspopup="dialog">
        At a glance
      </button>
      <dialog
        ref={dialogRef}
        className="gdialog gdialog--glance"
        aria-labelledby="impact-h"
        onClose={onClose}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <button type="button" className="icon-btn pdialog__close" onClick={close} aria-label="Close dialog">
          <span aria-hidden="true">✕</span> Close
        </button>
        <div className="glance-dialog">
          <h2 className="sec" id="impact-h">At a glance</h2>
          <dl className="stats">
            {stats.map((s) => (
              <div key={s.label} className={`card stat${s.value.length > 6 ? ' stat--long' : ''}`}>
                <dt><Counter value={s.value} sr={s.sr} /></dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
          <div className="grid grid--2">
            {highlights.map((h) => (
              <article key={h.title} className="card mc">
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </article>
            ))}
          </div>
        </div>
      </dialog>
    </>
  )
}
