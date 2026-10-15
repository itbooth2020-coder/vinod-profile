import { certifications, education, languages } from '../data.js'

const groups = [
  { title: 'Certifications', items: certifications },
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
          </article>
        ))}
      </div>
    </section>
  )
}
