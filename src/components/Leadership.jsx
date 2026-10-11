import { leadership, leadershipPhilosophy } from '../data.js'

// "How I lead": four cards of manager evidence from the resume (data.js `leadership`), with an
// optional pull-quote shown only once Vinod fills in `leadershipPhilosophy`.
export default function Leadership() {
  return (
    <section id="lead" aria-labelledby="lead-h">
      <h2 className="sec" id="lead-h">How I lead</h2>
      {leadershipPhilosophy && (
        <blockquote className="lead__quote">
          <p>{leadershipPhilosophy}</p>
        </blockquote>
      )}
      <div className="grid">
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
