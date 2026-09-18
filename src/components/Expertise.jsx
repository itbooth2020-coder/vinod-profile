import { expertise } from '../data.js'

export default function Expertise() {
  return (
    <section id="expertise" className="section section--alt">
      <div className="container">
        <h2>Technical Expertise</h2>
        <div className="grid">
          {expertise.map((e) => (
            <article key={e.title} className="card">
              <span className="card__icon" aria-hidden="true">{e.icon}</span>
              <h3>{e.title}</h3>
              <ul>
                {e.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
