import { profile, availability as a } from '../data.js'

const list = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const or = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`)

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-h">
      <div className="card contact">
        <h2 className="sec" id="contact-h">Let's connect</h2>
        <p>
          Interested in engineering leadership, mobile, IoT, MDM or AI-agent platforms? I'd be glad to hear from you.
        </p>
        {a.open && (
          <p className="avail__line">
            I&rsquo;m open to {list(a.roles)} roles. Based in {a.location}; {or(a.workModes.map((m) => m.toLowerCase()))}
            {a.relocation && '; open to relocation'}; notice period {a.notice}.
          </p>
        )}
        <div className="actions">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>{profile.email}</a>
          <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens in a new tab)</span></a>
          <a className="btn" href={profile.github} target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> (opens in a new tab)</span></a>
          <a className="btn" href={profile.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="btn" href={profile.x} target="_blank" rel="noopener noreferrer">X<span className="sr-only"> (Twitter)</span></a>
          <a className="btn" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Download resume</a>
        </div>
      </div>
    </section>
  )
}
