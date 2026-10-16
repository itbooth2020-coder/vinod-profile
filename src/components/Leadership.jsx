import { leadership, leadershipPhilosophy } from '../data.js'

// "How I lead": four cards of manager evidence from the resume (data.js `leadership`), with a
// pull-quote in his voice from `leadershipPhilosophy` (hidden if that is set to empty).
export default function Leadership() {
  return (
    <section id="lead" aria-labelledby="lead-h">
      <h2 className="sec" id="lead-h">How I lead</h2>
      {leadershipPhilosophy && (
        <blockquote className="lead__quote">
          <p>{leadershipPhilosophy}</p>
        </blockquote>
      )}
      <div className="grid grid--2">
        {leadership.map((l) => (
          <article key={l.title} className="card mc">
            <h3>{l.title}</h3>
            <ul>
              {l.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
