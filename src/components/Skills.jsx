import { useRef } from 'react'
import { skills } from '../data.js'
import usePrintOpen from '../hooks/usePrintOpen.js'

// Leadership first (UX-008). The group marked `earlier` in data.js is a collapsed "Earlier
// experience" card: still on the page, in print and in the assistant, but not leading the list.
export default function Skills() {
  const ref = useRef(null)
  usePrintOpen(ref)
  return (
    <section id="skills" aria-labelledby="skills-h" ref={ref}>
      <h2 className="sec" id="skills-h">Technical skills</h2>
      <div className="grid grid--skills">
        {skills.map((s) =>
          s.earlier ? (
            <details key={s.area} className="card mc skills__earlier">
              <summary><h3>{s.area}</h3></summary>
              <ul className="tags">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          ) : (
            <article key={s.area} className="card mc">
              <h3>{s.area}</h3>
              <ul className="tags">
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ),
        )}
      </div>
    </section>
  )
}
