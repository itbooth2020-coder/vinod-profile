import { skills } from '../data.js'

export default function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-h">
      <h2 className="sec" id="skills-h">Technical skills</h2>
      <div className="grid grid--skills">
        {skills.map((s) => (
          <article key={s.area} className="card mc">
            <h3>{s.area}</h3>
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
