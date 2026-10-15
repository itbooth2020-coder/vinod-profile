// Small HTTP helpers shared by the profile agent (/api/ask) and VINCE's voice (/api/speak).
// Plain Node (req, res), no framework, so both run under Vite's middleware or any Node server.

// A request body over the size limit: answered with 413, not "Invalid JSON" (PERF-BE-007).
export class TooLarge extends Error {}

export async function readJson(req, limit) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new TooLarge('Request too large')
    chunks.push(Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

// Every JSON response, errors included, says what it is and must not be cached.
export function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers })
  res.end(JSON.stringify(body))
}

export const methodNotAllowed = (res) => json(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' })

// 'CloudFront-Viewer-Address' is "ip:port", and IPv6 addresses come without brackets
// ("2001:db8::1:443"), so the port is whatever follows the last colon.
export function stripPort(value) {
  const v = String(value).trim()
  if (v.startsWith('[')) return v.slice(1, v.indexOf(']'))
  const i = v.lastIndexOf(':')
  return i > 0 ? v.slice(0, i) : v
}

// The visitor's address for per-IP limits (PERF-BE-003). Behind CloudFront the socket address is an
// edge server shared by many visitors, so CloudFront's viewer address header is used when present
// (add it to the origin request policy, and only let CloudFront reach the origin). Otherwise the
// first X-Forwarded-For hop, only when TRUST_PROXY is set (a trusted proxy wrote it), else the socket.
export function clientIp(req, env = process.env) {
  const viewer = req.headers['cloudfront-viewer-address']
  if (typeof viewer === 'string' && viewer.trim()) return stripPort(viewer)
  if (/^(1|true|yes)$/i.test(env.TRUST_PROXY || '')) {
    const first = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    if (first) return first
  }
  return req.socket?.remoteAddress || 'unknown'
}

// Drops entries that no longer matter every 10 minutes, and early if the map grows past `max`, so
// per-IP maps on a long-running server don't grow without bound. Returns a check to call per request.
export function pruned(map, isStale, { every = 10 * 60 * 1000, max = 10_000 } = {}) {
  const prune = () => {
    for (const [key, value] of map) if (isStale(value)) map.delete(key)
  }
  setInterval(prune, every).unref?.()
  return () => {
    if (map.size > max) prune()
  }
}
