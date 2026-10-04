import { experience } from '../data.js'

export default function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-h">
      <h3 className="sec" id="experience-h">Experience</h3>
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
