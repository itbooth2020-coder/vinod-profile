import { profile } from '../data.js'
import Typing from './Typing.jsx'

export default function Hero() {
  return (
    <section id="top" className="hero">
      <p className="badge">{profile.role} &middot; {profile.company}</p>
      <h1>{profile.firstName} <em>{profile.lastName}</em></h1>
      <p className="headline">{profile.headline}</p>
      <p className="lede">{profile.tagline}</p>
      <Typing words={profile.domains} />
      <div className="actions">
        <a className="btn btn--primary" href="#console">Ask the profile agent</a>
        <button type="button" className="btn btn--vince" onClick={() => window.dispatchEvent(new Event('vince:open'))}>
          <span className="btn__orb" aria-hidden="true" /> Talk to VINCE
        </button>
        <a className="btn" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Download resume</a>
        <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
    </section>
  )
}
