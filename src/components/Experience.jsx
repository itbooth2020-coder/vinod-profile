import { experience } from '../data.js'

export default function Experience() {
  return (
    <section id="experience" className="section">
      <div className="container">
        <h2>Experience</h2>
        <ol className="timeline">
          {experience.map((job) => (
            <li key={job.company} className={`timeline__item ${job.current ? 'is-current' : ''}`}>
              <h3>{job.role}</h3>
              <p className="timeline__company">
                {job.company}
                {job.current && <span className="badge">Current</span>}
              </p>
              {job.points.length > 0 && (
                <ul>
                  {job.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
