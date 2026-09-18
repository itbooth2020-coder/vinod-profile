import { profile } from '../data.js'

export default function Contact() {
  return (
    <section id="contact" className="section section--alt">
      <div className="container contact">
        <h2>Let's Connect</h2>
        <p className="lead">
          Interested in discussing engineering delivery, mobile or IoT platforms, or team leadership? I'd be glad to hear from you.
        </p>
        <a className="btn btn--primary" href={profile.linkedin} target="_blank" rel="noopener noreferrer">
          Find me on LinkedIn
        </a>
      </div>
    </section>
  )
}
