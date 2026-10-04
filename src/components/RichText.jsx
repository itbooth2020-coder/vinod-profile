import { mediaById } from '../agent/media.js'
import MediaTile from './MediaTile.jsx'
import Chart from './Chart.jsx'

// Renders the agent's answers: a small, safe Markdown subset built as React elements (no HTML injection).
// Paragraphs, **bold**, `code`, [links](https://…), lists, ### headings, | tables |,
// images ![caption](media:<id>) from the media catalog only, and ```chart JSON blocks.
// Works on partial text while an answer streams in.

const IMAGE_LINE = /^\s*(!\[[^\]]*\]\([^)\s]+\)\s*)+$/
const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)\)/g
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/
// Bare URLs stop before trailing punctuation so "…/vinod." links without the period.
const INLINE =
  /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)\s]+\)|https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"]|[\w.+-]+@[\w-]+\.[\w.-]*\w)/g
const BARE_URL = /^https?:\/\/\S+$/
const BARE_EMAIL = /^[\w.+-]+@[\w-]+\.[\w.-]*\w$/

function parseBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = line.match(/^\s*```(\w*)/)
    if (fence) {
      const body = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++])
      const closed = i < lines.length
      i++
      blocks.push({ type: closed ? (fence[1] === 'chart' ? 'chart' : 'code') : 'pending', lang: fence[1], text: body.join('\n') })
      continue
    }
    if (line.trim().startsWith('|') && TABLE_SEP.test(lines[i + 1] || '')) {
      const rows = []
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      blocks.push({ type: 'table', head, rows })
      continue
    }
    if (IMAGE_LINE.test(line)) {
      const images = []
      while (i < lines.length && IMAGE_LINE.test(lines[i])) {
        for (const m of lines[i].matchAll(IMAGE)) images.push({ alt: m[1], src: m[2] })
        i++
      }
      blocks.push({ type: 'images', images })
      continue
    }
    const heading = line.match(/^\s*#{1,4}\s+(.*)/)
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] })
      i++
      continue
    }
    const listMatch = /^\s*([-*•]|\d+\.)\s+/
    if (listMatch.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      while (i < lines.length && listMatch.test(lines[i])) items.push(lines[i++].replace(listMatch, ''))
      blocks.push({ type: 'list', ordered, items })
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para = []
    while (
      i < lines.length && lines[i].trim() &&
      !/^\s*(```|#{1,4}\s|[-*•]\s|\d+\.\s)/.test(lines[i]) &&
      !IMAGE_LINE.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && TABLE_SEP.test(lines[i + 1] || ''))
    ) para.push(lines[i++])
    blocks.push({ type: 'para', text: para.join('\n') })
  }
  return blocks
}

// Web links open in a new tab; mailto links open the mail app.
function Link({ href, children, className }) {
  const external = href.startsWith('http')
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  )
}

function Inline({ text }) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) return <Link key={i} href={link[2]}>{link[1]}</Link>
    if (BARE_URL.test(part)) return <Link key={i} href={part}>{part.replace(/^https?:\/\/(www\.)?/, '')}</Link>
    if (BARE_EMAIL.test(part)) return <Link key={i} href={`mailto:${part}`}>{part}</Link>
    return part
  })
}

// A paragraph that is just one link (e.g. "[Open LinkedIn profile](https://…)") shows as a button.
const LONE_LINK = /^\s*\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)\s*$/

function Gallery({ images }) {
  const items = images
    .map(({ alt, src }) => ({ alt, item: src.startsWith('media:') ? mediaById[src.slice(6)] : null }))
    .filter((x) => x.item)
  if (!items.length) return null
  return (
    <div className={`gallery${items.length === 1 ? ' gallery--single' : ''}`}>
      {items.map(({ alt, item }) => <MediaTile key={item.id} item={item} caption={alt} />)}
    </div>
  )
}

export default function RichText({ text }) {
  return (
    <div className="rich">
      {parseBlocks(text).map((b, i) => {
        switch (b.type) {
          case 'heading':
            return <h5 key={i}><Inline text={b.text} /></h5>
          case 'list': {
            const List = b.ordered ? 'ol' : 'ul'
            return <List key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</List>
          }
          case 'table':
            return (
              <div key={i} className="rich__table">
                <table>
                  <thead><tr>{b.head.map((h, j) => <th key={j} scope="col"><Inline text={h} /></th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Inline text={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            )
          case 'images':
            return <Gallery key={i} images={b.images} />
          case 'chart':
            return <Chart key={i} source={b.text} />
          case 'pending':
            return <p key={i} className="rich__pending">{b.lang === 'chart' ? 'Drawing chart…' : '…'}</p>
          case 'code':
            return <pre key={i}><code>{b.text}</code></pre>
          default: {
            const lone = b.text.match(LONE_LINK)
            if (lone) {
              return (
                <p key={i}>
                  <Link href={lone[2]} className="btn btn--primary rich__cta">{lone[1]}</Link>
                </p>
              )
            }
            return <p key={i}><Inline text={b.text} /></p>
          }
        }
      })}
    </div>
  )
}
