import { availability as a } from '../data.js'

// Open-to-work strip (hero and 30-second brief). The green dot is decorative; the pill's text
// carries the status. Renders nothing when availability.open is false.
const terms = () =>
  [a.location, a.workModes.join(' / '), a.relocation && 'Open to relocation', `Notice: ${a.notice}`].filter(Boolean)

export default function Availability(props) {
  if (!a.open) return null
  return (
    <div className="avail" {...props}>
      <p className="avail__status">
        <span className="avail__pill">
          <span className="avail__dot" aria-hidden="true" />
          Open to new roles
        </span>
        <span className="avail__roles">{a.roles.join(' · ')}</span>
      </p>
      <p>{terms().join(' · ')}</p>
    </div>
  )
}
