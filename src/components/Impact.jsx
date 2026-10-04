import { stats, highlights } from '../data.js'
import Counter from './Counter.jsx'

export default function Impact() {
  return (
    <section id="impact" aria-labelledby="impact-h">
      <h3 className="sec" id="impact-h">At a glance</h3>
      <dl className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <dt><Counter value={s.value} /></dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
      <div className="grid">
        {highlights.map((h) => (
          <article key={h.title} className="card mc">
            <h4>{h.title}</h4>
            <p>{h.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
