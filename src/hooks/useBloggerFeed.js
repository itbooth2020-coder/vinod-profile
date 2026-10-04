import { useEffect, useState } from 'react'

// Latest posts from a Blogger blog. Blogger feeds don't send CORS headers, so this uses the
// feed's JSONP format (alt=json-in-script). Returns { status: 'loading' | 'ready' | 'error', posts }.
let seq = 0
const TIMEOUT_MS = 8000

const text = (html = '') => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

function toPost(entry, blogUrl) {
  const url = entry.link?.find((l) => l.rel === 'alternate')?.href || ''
  const summary = text(entry.summary?.$t)
  return {
    id: entry.id?.$t || url,
    title: text(entry.title?.$t) || 'Untitled post',
    url: url.startsWith(blogUrl) ? url : blogUrl,
    // Blogger thumbnails come as 72px squares; ask for a 16:9 crop that fits the card.
    thumb: entry.media$thumbnail?.url?.replace(/\/s72(-[a-z0-9-]*)?\//, '/w480-h270-c/') || null,
    summary: summary.length > 140 ? `${summary.slice(0, 137).trimEnd()}…` : summary,
    labels: (entry.category || []).map((c) => c.term).slice(0, 3),
  }
}

export default function useBloggerFeed(blogUrl, max = 3) {
  const [state, setState] = useState({ status: 'loading', posts: [] })

  useEffect(() => {
    const cb = `__bloggerFeed${++seq}`
    const script = document.createElement('script')
    let done = false

    const finish = (next) => {
      if (done) return
      done = true
      setState(next)
      cleanup()
    }
    const cleanup = () => {
      clearTimeout(timer)
      window[cb] = () => {} // a late response after unmount must not throw
      script.remove()
    }

    window[cb] = (data) => {
      const entries = Array.isArray(data?.feed?.entry) ? data.feed.entry : []
      finish({ status: 'ready', posts: entries.slice(0, max).map((e) => toPost(e, blogUrl)) })
    }
    script.src = `${blogUrl}feeds/posts/summary?alt=json-in-script&max-results=${max}&callback=${cb}`
    script.async = true
    script.onerror = () => finish({ status: 'error', posts: [] })
    const timer = setTimeout(() => finish({ status: 'error', posts: [] }), TIMEOUT_MS)
    document.body.appendChild(script)

    return () => {
      done = true
      cleanup()
    }
  }, [blogUrl, max])

  return state
}
