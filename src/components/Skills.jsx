import { skills } from '../data.js'

export default function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-h">
      <h3 className="sec" id="skills-h">Technical skills</h3>
      <div className="grid">
        {skills.map((s) => (
          <article key={s.area} className="card mc">
            <h4>{s.area}</h4>
            <ul className="tags">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
