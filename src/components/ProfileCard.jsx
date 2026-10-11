import { useRef, useState } from 'react'
import { profileCard } from '../data.js'
import ProfileDialog from './ProfileDialog.jsx'

export default function ProfileCard() {
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
        <h3>Profile card</h3>
        <button type="button" className="icon-btn" onClick={show} aria-haspopup="dialog">
          <span aria-hidden="true">⤢</span> Open<span className="sr-only"> full profile</span>
        </button>
      </div>
      {/* The photo is shown in the hero; "Open" above shows it full size in the dialog. */}
      <div className="profile">
        <dl className="kv">
          {profileCard.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <dialog
        ref={dialogRef}
        className="gdialog gdialog--profile"
        aria-labelledby="pdialog-title"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <button type="button" className="icon-btn pdialog__close" onClick={close} aria-label="Close dialog">
          <span aria-hidden="true">✕</span> Close
        </button>
        {open && <ProfileDialog titleId="pdialog-title" />}
      </dialog>
    </div>
  )
}
