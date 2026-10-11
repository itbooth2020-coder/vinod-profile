import { useState } from 'react'
import { profile } from '../data.js'

export default function Avatar() {
  const [failed, setFailed] = useState(false)
  const initials = profile.name.split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).map((w) => w[0]).join('')

  return (
    <div className="avatar">
      {failed ? (
        <span className="avatar__fallback" role="img" aria-label={profile.name}>{initials}</span>
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}profile.webp`}
          alt={`Portrait of ${profile.name}`}
          width="320"
          height="320"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
