import { availability as a, showAvailability } from '../data.js'

// Open-to-work strip (hero and 30-second brief). The green dot is decorative; the pill's text
// carries the status. Renders nothing (no element, no space) unless data.js showAvailability is true.
const terms = () =>
  [a.location, a.workModes.join(' / '), a.relocation && 'Open to relocation', `Notice: ${a.notice}`].filter(Boolean)

export default function Availability(props) {
  if (!showAvailability) return null
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
