import { stats, highlights } from '../data.js'
import Counter from './Counter.jsx'

export default function Impact() {
  return (
    <section id="impact" aria-labelledby="impact-h">
      <h2 className="sec" id="impact-h">At a glance</h2>
      <dl className="stats">
        {stats.map((s) => (
          <div key={s.label} className={`card stat${s.value.length > 6 ? ' stat--long' : ''}`}>
            <dt><Counter value={s.value} sr={s.sr} /></dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
      <div className="grid">
        {highlights.map((h) => (
          <article key={h.title} className="card mc">
            <h3>{h.title}</h3>
            <p>{h.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
