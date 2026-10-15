// Fetches the latest posts of both Blogger blogs at build time (ADS-002, PERF-BE-005), so the page
// never loads anything from Google at runtime: posts go to src/data/blogs.json and their thumbnails
// to public/blog-thumbs/. Runs as `prebuild` (npm run build) and on its own: `node scripts/fetch-blogs.mjs`.
// If a feed can't be fetched, the existing blogs.json and thumbnails are kept and a warning is printed;
// the build never fails because of Blogger.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blogs } from '../src/data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src/data/blogs.json')
const THUMBS = path.join(ROOT, 'public/blog-thumbs')
const MAX = 3
const TIMEOUT_MS = 15000

const warn = (msg) => console.warn(`fetch-blogs: ${msg}`)

// Plain text from Blogger's HTML fields (titles and summaries are escaped HTML).
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const text = (html = '') =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) =>
      e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTITIES[e.toLowerCase()] ?? m,
    )
    .replace(/\s+/g, ' ')
    .trim()

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'User-Agent': 'vinod-profile build (fetch-blogs)' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res
}

// Downloads a thumbnail once (the name is a hash of its URL) and returns its public path, or null.
async function thumbFor(url) {
  if (!url) return null
  // Blogger thumbnails come as 72px squares; ask for a 16:9 crop that fits the card.
  const src = url.replace(/\/s72(-[a-z0-9-]*)?\//, '/w480-h270-c/')
  const base = createHash('sha256').update(src).digest('hex').slice(0, 16)
  const existing = existsSync(THUMBS) && readdirSync(THUMBS).find((f) => f.startsWith(`${base}.`))
  if (existing) return `blog-thumbs/${existing}`
  try {
    const res = await get(src)
    const type = res.headers.get('content-type') || ''
    const ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /gif/.test(type) ? 'gif' : 'jpg'
    mkdirSync(THUMBS, { recursive: true })
    writeFileSync(path.join(THUMBS, `${base}.${ext}`), Buffer.from(await res.arrayBuffer()))
    return `blog-thumbs/${base}.${ext}`
  } catch (e) {
    warn(`thumbnail skipped (${e.message})`)
    return null
  }
}

async function postsOf(blogUrl) {
  const res = await get(`${blogUrl}feeds/posts/summary?alt=json&max-results=${MAX}`)
  const data = await res.json()
  const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry.slice(0, MAX) : []
  return Promise.all(
    entries.map(async (entry) => {
      const url = entry.link?.find((l) => l.rel === 'alternate')?.href || ''
      const summary = text(entry.summary?.$t)
      const id = entry.id?.$t || url
      const src = entry.media$thumbnail?.url
      return {
        id,
        title: text(entry.title?.$t) || 'Untitled post',
        url: url.startsWith(blogUrl) ? url : blogUrl,
        date: (entry.published?.$t || '').slice(0, 10),
        summary: summary.length > 140 ? `${summary.slice(0, 137).trimEnd()}…` : summary,
        labels: (entry.category || []).map((c) => c.term).slice(0, 3),
        // A failed download keeps the post's previous thumbnail, so a network blip isn't a change.
        thumb: (await thumbFor(src)) ?? (src ? previousThumb(id) : null),
      }
    }),
  )
}

// The current file as written on disk, so an unchanged run leaves it byte-for-byte alone and a
// changed run keeps its line endings (CRLF in a Windows checkout with core.autocrlf) and final newline.
const raw = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
const previous = raw ? JSON.parse(raw) : { blogs: {} }
const EOL = raw ? (raw.includes('\r\n') ? '\r\n' : '\n') : process.platform === 'win32' ? '\r\n' : '\n'
const finalNewline = raw ? /\r?\n$/.test(raw) : true
const serialise = (data) => JSON.stringify(data, null, 2).replace(/\n/g, EOL) + (finalNewline ? EOL : '')
// Key-order-independent JSON, used to compare posts while ignoring `fetched`.
const stable = (v) =>
  Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
  : JSON.stringify(v)

// The thumbnail a post already had, if its file is still on disk.
function previousThumb(id) {
  const thumb = Object.values(previous.blogs).flat().find((p) => p.id === id)?.thumb
  return thumb && existsSync(path.join(ROOT, 'public', thumb)) ? thumb : null
}

const next = { fetched: previous.fetched || null, blogs: { ...previous.blogs } }
let fetchedAny = false

for (const [key, blog] of Object.entries(blogs)) {
  try {
    next.blogs[key] = await postsOf(blog.url)
    fetchedAny = true
    console.log(`fetch-blogs: ${blog.name}: ${next.blogs[key].length} posts`)
  } catch (e) {
    warn(`${blog.name}: ${e.message}; keeping the ${next.blogs[key]?.length ?? 0} posts already in blogs.json`)
    next.blogs[key] ??= []
  }
}

if (raw === null) {
  if (fetchedAny) next.fetched = new Date().toISOString().slice(0, 10)
  mkdirSync(path.dirname(OUT), { recursive: true })
  writeFileSync(OUT, serialise(next))
  if (!fetchedAny) warn('no feed could be fetched; wrote an empty blogs.json')
} else if (!fetchedAny) {
  warn('no feed could be fetched; blogs.json left unchanged')
} else if (stable(next.blogs) === stable(previous.blogs)) {
  console.log('fetch-blogs: no changes; blogs.json left unchanged')
} else {
  next.fetched = new Date().toISOString().slice(0, 10)
  writeFileSync(OUT, serialise(next))
  console.log('fetch-blogs: posts changed; blogs.json updated')
}

// Drop thumbnails no post uses any more (only after a successful fetch, so a failed run never deletes).
if (fetchedAny && existsSync(THUMBS)) {
  const used = new Set(Object.values(next.blogs).flat().map((p) => p.thumb && path.basename(p.thumb)))
  for (const f of readdirSync(THUMBS)) {
    if (!used.has(f)) {
      rmSync(path.join(THUMBS, f))
      console.log(`fetch-blogs: removed unused thumbnail ${f}`)
    }
  }
}
