import { useState } from 'react'
import { profile } from '../data.js'

// priority: the photo is above the fold (hero), so fetch it early.
// sizes: the displayed width per breakpoint, so the browser picks the 160, 320 or 800 px file
// (public/profile-160.webp, profile-320.webp, profile.webp; the dialog uses the 800 px one).
const base = import.meta.env.BASE_URL
const SRCSET = `${base}profile-160.webp 160w, ${base}profile-320.webp 320w, ${base}profile.webp 800w`

export default function Avatar({ priority = false, sizes = '96px' }) {
  const [failed, setFailed] = useState(false)
  const initials = profile.name.split(' ').filter((_, i, a) => i === 0 || i === a.length - 1).map((w) => w[0]).join('')

  return (
    <div className="avatar">
      {failed ? (
        <span className="avatar__fallback" role="img" aria-label={profile.name}>{initials}</span>
      ) : (
        <img
          src={`${base}profile-320.webp`}
          srcSet={SRCSET}
          sizes={sizes}
          alt={`Portrait of ${profile.name}`}
          width="320"
          height="320"
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
