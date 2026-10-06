// VINCE's voice: text-to-speech through ElevenLabs, mounted at /api/speak.
// The browser posts one sentence at a time and plays the MP3 through its JARVIS-style effect
// chain (src/agent/voice.js). The API key stays server-side. Without a key, or when a limit or
// the ElevenLabs quota is reached, the endpoint answers 503 {fallback: true} and the browser
// switches to its built-in voice.
//
// Environment (.env):
//   ELEVENLABS_API_KEY            required to enable the voice
//   ELEVENLABS_VOICE_ID           optional; defaults to George (warm, distinguished British male).
//                                 Daniel, deeper and more authoritative: onwK4e9ZLuTAKqWW03F9
//   ELEVENLABS_MODEL              optional; defaults to eleven_multilingual_v2
//   ELEVENLABS_DAILY_CHAR_LIMIT   optional; characters per day across all visitors (default 10000)

const API = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb' // George (premade)
const DEFAULT_MODEL = 'eleven_multilingual_v2'
const MAX_TEXT = 400

// Calm and measured, like a butler: steadier than default, a little style, natural pace.
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.0 }

// Limits, so a public deployment can't be used as a free text-to-speech service.
const WINDOW_MS = 10 * 60 * 1000
const MAX_CHARS_PER_IP = 4000
const perIp = new Map()
let day = ''
let dayChars = 0
let pausedUntil = 0 // set after an auth or quota error, to stop retrying for a while

function overBudget(ip, n) {
  const now = Date.now()
  const today = new Date().toISOString().slice(0, 10)
  if (today !== day) {
    day = today
    dayChars = 0
  }
  const dailyLimit = Number(process.env.ELEVENLABS_DAILY_CHAR_LIMIT) || 10000
  const recent = (perIp.get(ip) || []).filter((e) => now - e.t < WINDOW_MS)
  const used = recent.reduce((sum, e) => sum + e.n, 0)
  perIp.set(ip, recent)
  if (used + n > MAX_CHARS_PER_IP || dayChars + n > dailyLimit) return true
  recent.push({ t: now, n })
  dayChars += n
  return false
}

// Repeated lines (the introduction, tour stops, acknowledgements) are served from memory and
// don't count against the limits.
const cache = new Map()
const CACHE_MAX = 200
function remember(key, audio) {
  cache.set(key, audio)
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 8_000) throw new Error('Request too large')
  }
  return JSON.parse(raw || '{}')
}

const fallback = (res, status, reason) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ fallback: true, error: reason }))
}

// Node-style (req, res) handler, usable from Vite middleware or any Node HTTP server.
export async function handleSpeak(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end()
  }
  let body
  try {
    body = await readJson(req)
  } catch {
    return fallback(res, 400, 'Invalid JSON')
  }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text || text.length > MAX_TEXT) return fallback(res, 400, 'Text must be 1-400 characters')

  const key = process.env.ELEVENLABS_API_KEY
  if (!key || Date.now() < pausedUntil) return fallback(res, 503, 'Voice service not available')

  const voice = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE
  const model = process.env.ELEVENLABS_MODEL || DEFAULT_MODEL
  const cacheKey = `${voice}|${model}|${text}`
  const headers = { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }
  if (cache.has(cacheKey)) {
    res.writeHead(200, headers)
    return res.end(cache.get(cacheKey))
  }
  if (overBudget(req.socket?.remoteAddress || 'unknown', text.length)) return fallback(res, 429, 'Voice limit reached')

  const ctrl = new AbortController()
  res.on('close', () => ctrl.abort())
  try {
    const upstream = await fetch(`${API}/${voice}/stream?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
      body: JSON.stringify({ text, model_id: model, voice_settings: VOICE_SETTINGS }),
      signal: ctrl.signal,
    })
    if (!upstream.ok || !upstream.body) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 300)
      console.error('[voice-agent]', upstream.status, detail)
      // Bad key or used-up quota: stop calling ElevenLabs for 10 minutes.
      if (upstream.status === 401 || upstream.status === 402 || /quota/i.test(detail)) pausedUntil = Date.now() + 10 * 60 * 1000
      return fallback(res, 503, 'Voice service unavailable')
    }
    res.writeHead(200, headers)
    const chunks = []
    for await (const chunk of upstream.body) {
      chunks.push(chunk)
      res.write(chunk)
    }
    res.end()
    remember(cacheKey, Buffer.concat(chunks))
  } catch (err) {
    if (ctrl.signal.aborted) return
    console.error('[voice-agent]', err?.message ?? err)
    if (!res.headersSent) fallback(res, 503, 'Voice service unavailable')
    else res.end()
  }
}
