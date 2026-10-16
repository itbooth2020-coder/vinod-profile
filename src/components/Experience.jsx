import { useRef } from 'react'
import { experience } from '../data.js'
import usePrintOpen from '../hooks/usePrintOpen.js'

export default function Experience() {
  const ref = useRef(null)

  usePrintOpen(ref) // print every role in full

  return (
    <section id="experience" aria-labelledby="experience-h" ref={ref}>
      <h2 className="sec" id="experience-h">Experience</h2>
      <ol className="timeline">
        {experience.map((job, i) => (
          <li key={job.company} className="card job">
            <details open={i < 2}>
              <summary>
                <span className="job__role">{job.role}</span>
                <span className="job__company">
                  {job.company}
                  {job.current && <span className="badge">current</span>}
                </span>
                <span className="job__meta">{job.period} · {job.location}</span>
              </summary>
              <ul>
                {job.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>
    </section>
  )
}
