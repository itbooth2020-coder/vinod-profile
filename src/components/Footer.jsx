import { profile } from '../data.js'
import { liveAgent } from '../agent/askAgent.js'

export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} {profile.name} · {profile.location} ·{' '}
      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> ·{' '}
      <a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub</a> ·{' '}
      <a href={profile.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> ·{' '}
      <a href={profile.x} target="_blank" rel="noopener noreferrer">X<span className="sr-only"> (Twitter)</span></a>
      <br />
      The profile assistant answers from the resume{liveAgent && '; when the live agent is available it uses Claude with the resume and LinkedIn'}. Answers can contain mistakes; check the resume for exact details.
    </footer>
  )
}
