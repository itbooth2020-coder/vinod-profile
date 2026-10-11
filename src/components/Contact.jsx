import { profile } from '../data.js'

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-h">
      <div className="card contact">
        <h3 className="sec" id="contact-h">Let's connect</h3>
        <p>
          Interested in engineering leadership, mobile, IoT, MDM or AI-agent platforms? I'd be glad to hear from you.
        </p>
        <div className="actions">
          <a className="btn btn--primary" href={`mailto:${profile.email}`}>{profile.email}</a>
          <a className="btn" href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a className="btn" href={profile.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="btn" href={profile.x} target="_blank" rel="noopener noreferrer">X<span className="sr-only"> (Twitter)</span></a>
          <a className="btn" href={`${import.meta.env.BASE_URL}${profile.resume}`} download>Resume (PDF)</a>
        </div>
      </div>
    </section>
  )
}
