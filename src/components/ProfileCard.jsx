import { useRef, useState } from 'react'
import { profile, profileCard } from '../data.js'
import ProfileDialog from './ProfileDialog.jsx'

// The hero's "at a glance" details (Hero.jsx): a few rows of the profile card, and "More" to open the
// full profile dialog. Availability, age and nationality aren't shown here.
const GLANCE = ['role', 'company', 'experience', 'team scale', 'location']
const rows = profileCard.filter(([k]) => GLANCE.includes(k))

export default function ProfileCard() {
  const dialogRef = useRef(null)
  const [open, setOpen] = useState(false)

  const show = () => {
    setOpen(true)
    dialogRef.current.showModal()
    // The content renders after showModal(): until then the dialog is nearly empty, and focusing its
    // Close button scrolls it, which would leave it opened part-way down with Close clipped.
    dialogRef.current.scrollTop = 0
  }
  const close = () => dialogRef.current.close()

  return (
    <div className="glance">
      <h2 className="sr-only">Profile details</h2>
      <dl className="kv">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {/* The native modal dialog returns focus to this button when it closes. */}
      <button type="button" className="icon-btn glance__more" onClick={show} aria-haspopup="dialog">
        More<span className="sr-only"> about {profile.firstName}</span> <span aria-hidden="true">⤢</span>
      </button>

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
