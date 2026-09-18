import { profile, industries } from '../data.js'

export default function About() {
  return (
    <section id="about" className="section">
      <div className="container about">
        <div>
          <h2>About</h2>
          {profile.about.map((p) => (
            <p key={p} className="lead">{p}</p>
          ))}
        </div>
        <aside className="card about__card">
          <h3>Industries served</h3>
          <ul className="chips chips--solid">
            {industries.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <h3>Currently</h3>
          <p>{profile.role}, {profile.company}</p>
          <h3>Previously</h3>
          <p>HTC</p>
        </aside>
      </div>
    </section>
  )
}
