import { useRef, useState } from 'react'
import { profile, profileCard } from '../data.js'
import ProfileDialog from './ProfileDialog.jsx'

// The hero's "at a glance" details (Hero.jsx): a few rows of the profile card, and "More" to open the
// full profile dialog, on one row with the 30-second brief switch (App.jsx owns its state, ref and focus
// return). Availability, age and nationality aren't shown here.
const GLANCE = ['role', 'company', 'experience', 'team scale', 'location']
const rows = profileCard.filter(([k]) => GLANCE.includes(k))

export default function ProfileCard({ brief, onToggleBrief, toggleRef }) {
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
      <div className="glance__actions">
        {/* Switches between the full profile and the brief (App.jsx). The label text is the accessible name. */}
        <button ref={toggleRef} type="button" role="switch" className="brief-switch" aria-checked={brief} onClick={onToggleBrief}>
          <span className="brief-switch__label">30-second brief</span>
          <span className="brief-switch__track" aria-hidden="true">
            <span className="brief-switch__thumb">
              <svg viewBox="0 0 12 12" width="10" height="10" focusable="false">
                <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        </button>
        {/* The native modal dialog returns focus to this button when it closes. */}
        <button type="button" className="icon-btn glance__more" onClick={show} aria-haspopup="dialog">
          More<span className="sr-only"> about {profile.firstName}</span> <span aria-hidden="true">⤢</span>
        </button>
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
