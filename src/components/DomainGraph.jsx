import { useRef, useState } from 'react'
import GraphView from './GraphView.jsx'

export default function DomainGraph() {
  const dialogRef = useRef(null)
  const [open, setOpen] = useState(false)

  const show = () => {
    setOpen(true)
    dialogRef.current.showModal()
  }
  const close = () => dialogRef.current.close()

  return (
    <div className="card">
      <div className="card__head">
        <h2>Domain graph</h2>
        <button type="button" className="icon-btn" onClick={show} aria-haspopup="dialog">
          <span aria-hidden="true">⤢</span> Open
        </button>
      </div>
      <GraphView />

      <dialog
        ref={dialogRef}
        className="gdialog"
        aria-labelledby="gdialog-title"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="card__head">
          <h2 id="gdialog-title">Domain graph · projects &amp; technologies</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close dialog">
            <span aria-hidden="true">✕</span> Close
          </button>
        </div>
        {open && <GraphView large />}
      </dialog>
    </div>
  )
}
