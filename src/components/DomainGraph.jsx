import { useEffect, useRef, useState } from 'react'
import { explainNode } from '../agent/vince.js'
import { unlockSpeech } from '../agent/voice.js'
import GraphView from './GraphView.jsx'

const ROOT = { id: 'root', type: 'root', label: 'Vinod', children: [] }

// The full-size dialog has an "Ask VINCE" button in its header that explains the selected node.
// The dialog is modal, so VINCE's own panel would be hidden behind it: VINCE speaks the
// explanation (and logs it in his conversation) while the dialog shows it as a caption.
export default function DomainGraph() {
  const dialogRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(ROOT)
  const [explained, setExplained] = useState(null) // the node VINCE last explained
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const onMode = (e) => setSpeaking(e.detail === 'speaking')
    window.addEventListener('vince:mode', onMode)
    return () => window.removeEventListener('vince:mode', onMode)
  }, [])

  const show = () => {
    setOpen(true)
    setSelected(ROOT)
    setExplained(null)
    dialogRef.current.showModal()
  }
  const close = () => dialogRef.current.close()

  const askVince = () => {
    unlockSpeech()
    setExplained(selected)
    window.dispatchEvent(new CustomEvent('vince:explain', { detail: selected }))
  }

  const name = selected.type === 'root' ? 'the graph' : selected.label

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
        onClose={() => {
          setOpen(false)
          window.dispatchEvent(new Event('vince:stop'))
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="card__head">
          <h2 id="gdialog-title">Domain graph · projects &amp; technologies</h2>
          <div className="gdialog__tools">
            <button type="button" className="askvince__btn" onClick={askVince} aria-label={`Ask VINCE to explain ${name}`}>
              <span className="btn__orb" aria-hidden="true" />
              Ask VINCE<span className="askvince__label">&nbsp;to explain {name}</span>
            </button>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close dialog">
              <span aria-hidden="true">✕</span> Close
            </button>
          </div>
        </div>
        {explained && (
          <div className="askvince__caption" role="status">
            <p>
              <b>VINCE{speaking ? ' · speaking' : ''}:</b> {explainNode(explained)}
            </p>
            {speaking && (
              <button type="button" className="icon-btn" onClick={() => window.dispatchEvent(new Event('vince:stop'))}>
                <span aria-hidden="true">■</span> Stop
              </button>
            )}
          </div>
        )}
        {open && <GraphView large onSelect={(node) => setSelected(node ?? ROOT)} />}
      </dialog>
    </div>
  )
}
