import { profile } from '../data.js'

export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} {profile.name} · {profile.location} ·{' '}
      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> ·{' '}
      <a href={profile.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> ·{' '}
      <a href={profile.x} target="_blank" rel="noopener noreferrer">X<span className="sr-only"> (Twitter)</span></a>
      <br />
      The profile agent answers from the resume and LinkedIn at runtime using Claude. Answers can contain mistakes. Check the resume for exact details.
    </footer>
  )
}
