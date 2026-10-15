import { useState } from 'react'

const initials = (label) =>
  label.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

// Map pin (24×24 line icon, currentColor) for location tiles.
const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
)

// One catalog image (see src/agent/media.js): a local file (photo or saved logo), or a monogram tile.
export default function MediaTile({ item, caption }) {
  const [failed, setFailed] = useState(false)
  const text = caption || item.label
  const src = item.src ? `${import.meta.env.BASE_URL}${item.src}` : null

  return (
    <figure className={`media media--${item.kind}`}>
      {src && !failed ? (
        <img src={src} alt={text} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="media__mono" role="img" aria-label={text}>
          {item.icon === 'pin' ? <PinIcon /> : item.mono || initials(item.label)}
        </span>
      )}
      <figcaption>{text}</figcaption>
    </figure>
  )
}
