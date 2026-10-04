import { useState } from 'react'

const initials = (label) =>
  label.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

// One catalog image (see src/agent/media.js): local file, organization logo, or monogram tile.
export default function MediaTile({ item, caption }) {
  const [failed, setFailed] = useState(false)
  const text = caption || item.label
  const src = item.src
    ? `${import.meta.env.BASE_URL}${item.src}`
    : item.domain
      ? `https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`
      : null

  return (
    <figure className={`media media--${item.kind}`}>
      {src && !failed ? (
        <img src={src} alt={text} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="media__mono" role="img" aria-label={text}>{item.mono || initials(item.label)}</span>
      )}
      <figcaption>{text}</figcaption>
    </figure>
  )
}
