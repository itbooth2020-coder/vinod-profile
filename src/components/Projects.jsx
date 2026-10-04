import { projects, otherProjects } from '../data.js'

export default function Projects() {
  return (
    <section id="projects" aria-labelledby="projects-h">
      <h3 className="sec" id="projects-h">Key projects</h3>
      <div className="grid">
        {projects.map((p) => (
          <article key={p.name} className="card mc">
            <span className="tag">{p.tag}</span>
            <h4>{p.name}</h4>
            <p>{p.text}</p>
          </article>
        ))}
      </div>
      <p className="more">
        <span>Also:</span> {otherProjects.join(' · ')}
      </p>
    </section>
  )
}
