import { certifications, learning, education, languages } from '../data.js'

const groups = [
  { title: 'Certifications', items: certifications, more: { title: 'Currently learning', items: learning } },
  { title: 'Education', items: education },
  { title: 'Languages', items: languages },
]

export default function Credentials() {
  return (
    <section id="credentials" aria-labelledby="credentials-h">
      <h2 className="sec" id="credentials-h">Credentials</h2>
      <div className="grid grid--3">
        {groups.map((g) => (
          <article key={g.title} className="card mc">
            <h3>{g.title}</h3>
            <ul>
              {g.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {/* Courses in progress, kept apart from completed certifications (UX-007). */}
            {g.more?.items.length > 0 && (
              <>
                <h4 className="mc__sub">{g.more.title}</h4>
                <ul>
                  {g.more.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
