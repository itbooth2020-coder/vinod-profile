import { Suspense } from 'react'
import SectionBoundary, { lazyRetry } from './SectionBoundary.jsx'

// Pieces of answers and case studies that load as their own chunks (FUNC-014): if one can't load,
// the answer still shows, with plain text in its place.
const MediaTile = lazyRetry(() => import('./MediaTile.jsx'))
const Citations = lazyRetry(() => import('./Citations.jsx'))

// An image tile; until it loads, or if it can't, its caption as text.
export function Tile({ item, caption }) {
  const text = <figure className={`media media--${item.kind}`}><figcaption>{caption || item.label}</figcaption></figure>
  return (
    <SectionBoundary fallback={text} onRetry={MediaTile.reset}>
      <Suspense fallback={text}>
        <MediaTile item={item} caption={caption} />
      </Suspense>
    </SectionBoundary>
  )
}

// The "Sources" list under a live answer; if it can't load, the cited passages as a line of text.
export function Sources({ items }) {
  if (!items?.length) return null
  const text = <p className="cites">Sources: {items.map((c) => `“${c.text}” (${c.label})`).join('; ')}</p>
  return (
    <SectionBoundary fallback={text} onRetry={Citations.reset}>
      <Suspense fallback={null}>
        <Citations items={items} />
      </Suspense>
    </SectionBoundary>
  )
}
