import { profileCard } from '../data.js'
import Avatar from './Avatar.jsx'

export default function ProfileCard() {
  return (
    <div className="card">
      <h2>Profile card</h2>
      <div className="profile">
        <Avatar />
        <dl className="kv">
          {profileCard.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
