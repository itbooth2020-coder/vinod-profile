import { certifications, education, languages } from '../data.js'

const groups = [
  { title: 'Certifications', items: certifications },
  { title: 'Education', items: education },
  { title: 'Languages', items: languages },
]

export default function Credentials() {
  return (
    <section id="credentials" aria-labelledby="credentials-h">
      <h3 className="sec" id="credentials-h">Credentials</h3>
      <div className="grid">
        {groups.map((g) => (
          <article key={g.title} className="card mc">
            <h4>{g.title}</h4>
            <ul>
              {g.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
