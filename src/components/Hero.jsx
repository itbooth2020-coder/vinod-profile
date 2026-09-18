import { profile, stats } from '../data.js'
import Avatar from './Avatar.jsx'
import Typing from './Typing.jsx'
import Counter from './Counter.jsx'
import Particles from './Particles.jsx'

export default function Hero() {
  return (
    <section id="top" className="hero">
      <Particles />
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="container">
        <div className="hero__top">
        <div className="hero__text">
        <p className="eyebrow">
          {profile.role} · {profile.company}
        </p>
        <h1>{profile.name}</h1>
        <p className="hero__tagline">{profile.tagline}</p>
        <Typing words={profile.domains} />
        <ul className="chips">
          {profile.domains.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div className="hero__actions">
          <a className="btn btn--primary" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            Connect on LinkedIn
          </a>
          <a className="btn btn--ghost" href="#expertise">
            View expertise
          </a>
        </div>
        </div>
        <Avatar />
        </div>
        <dl className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stats__item">
              <dt><Counter value={s.value} /></dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
