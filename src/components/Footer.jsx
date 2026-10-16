import { useEffect, useState } from 'react'
import { profile } from '../data.js'
import { liveAgent } from '../agent/askAgent.js'

export default function Footer() {
  // The build year (vite.config.js) matches the prerendered HTML; then this year, if a build is older.
  const [year, setYear] = useState(__BUILD_YEAR__)
  useEffect(() => setYear(new Date().getFullYear()), [])
  return (
    <footer className="footer">
      © {year} {profile.name} · {profile.location} ·{' '}
      <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> (opens in a new tab)</span></a> ·{' '}
      <a href={profile.github} target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> (opens in a new tab)</span></a> ·{' '}
      <a href={profile.facebook} target="_blank" rel="noopener noreferrer">Facebook<span className="sr-only"> (opens in a new tab)</span></a> ·{' '}
      <a href={profile.x} target="_blank" rel="noopener noreferrer">X<span className="sr-only"> (Twitter, opens in a new tab)</span></a> ·{' '}
      <a href="/privacy.html">Privacy</a>
      <br />
      VINCE, the profile assistant, answers from the resume{liveAgent && '; when the live agent is available it uses Claude with the resume and LinkedIn'}. Answers can contain mistakes; contact Vinod for exact details.
      <br />
      Company names and logos identify employers and clients and belong to their owners; no endorsement is implied.
    </footer>
  )
}
