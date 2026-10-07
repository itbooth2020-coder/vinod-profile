// VINCE's voice: free, open-source text-to-speech with Kokoro (Apache-2.0), mounted at /api/speak.
// Runs on this server's CPU: no API key, no quota, no cost. The model (~160 MB at fp16) downloads
// from Hugging Face on first start and is cached; it loads in the background when the server
// starts. The browser posts one sentence at a time and plays the WAV through its JARVIS-style
// effect chain (src/agent/voice.js). While the model is loading, or if the voice is turned off,
// the endpoint answers 503 and the browser uses its built-in voice instead.
//
// Environment (.env), all optional:
//   VINCE_VOICE=off   turn the server voice off (the browser voice is used)
//   KOKORO_VOICE      default bm_george (British male); bm_fable is a lighter alternative
//   KOKORO_DTYPE      default fp16; fp32 is slightly larger, q8 is smaller but slower on CPU
//   KOKORO_SPEED      default 1.0

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
// Prepared fixed lines are saved here, so a restart doesn't have to generate them again.
const DISK_CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.voice-cache')
const MAX_TEXT = 400
const MAX_QUEUE = 24

// Limits, so a public deployment's CPU can't be used as a free text-to-speech service.
const WINDOW_MS = 10 * 60 * 1000
const MAX_CHARS_PER_IP = 4000
const perIp = new Map()

function overBudget(ip, n) {
  const now = Date.now()
  const recent = (perIp.get(ip) || []).filter((e) => now - e.t < WINDOW_MS)
  const used = recent.reduce((sum, e) => sum + e.n, 0)
  perIp.set(ip, recent)
  if (used + n > MAX_CHARS_PER_IP) return true
  recent.push({ t: now, n })
  return false
}

const enabled = () => process.env.VINCE_VOICE !== 'off'
const voice = () => process.env.KOKORO_VOICE || 'bm_george'
const speed = () => Number(process.env.KOKORO_SPEED) || 1.0
const keyFor = (text) => `${voice()}|${speed()}|${text}`

// Generated lines are kept in memory. VINCE's fixed lines, prepared at start-up, are kept for
// good; other lines are dropped oldest-first.
const fixed = new Map()
const cache = new Map()
const CACHE_MAX = 200
const cached = (key) => fixed.get(key) ?? cache.get(key)
const diskPath = (key) => path.join(DISK_CACHE, createHash('sha1').update(key).digest('hex') + '.wav')
function remember(key, audio) {
  cache.set(key, audio)
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
}

// One sentence at a time, since the CPU is the bottleneck. Visitors' requests always go first
// and run in arrival order, so a line's first sentence is ready first; preparing fixed lines
// only uses the time in between.
const jobs = { visitor: [], prepare: [] }
let busy = false
const pending = () => jobs.visitor.length

function synthesize(text, { prepare = false, cancelled = () => false } = {}) {
  return new Promise((resolve, reject) => {
    jobs[prepare ? 'prepare' : 'visitor'].push({ text, prepare, cancelled, resolve, reject })
    pump()
  })
}

async function pump() {
  if (busy) return
  const job = jobs.visitor.shift() || jobs.prepare.shift()
  if (!job) return
  busy = true
  try {
    const key = keyFor(job.text)
    if (job.cancelled()) job.resolve(null) // the visitor pressed Stop or moved on: skip it
    else if (cached(key)) job.resolve(cached(key))
    else {
      const out = await tts.generate(job.text, { voice: voice(), speed: speed() })
      const audio = wav16(out.audio, out.sampling_rate)
      if (job.prepare) {
        fixed.set(key, audio)
        await writeFile(diskPath(key), audio).catch(() => {})
      } else remember(key, audio)
      job.resolve(audio)
    }
  } catch (err) {
    job.reject(err)
  } finally {
    busy = false
    pump()
  }
}

// VINCE's fixed lines, split exactly as the browser will ask for them, so they play without any
// wait. Ordered by how soon a visitor is likely to hear them: acknowledgements, the introduction
// for each time of day, the follow-up phrases and suggested questions, then the tour.
async function prepareFixedLines() {
  const { GREETINGS, ACKNOWLEDGEMENTS, introduction, welcomeBack, tourSteps, toSpeech, followUpPieces } = await import('../src/agent/vince.js')
  const { speechChunks } = await import('../src/agent/chunks.js')
  const followUps = followUpPieces()
  const lines = [
    ...ACKNOWLEDGEMENTS,
    ...GREETINGS.map((g) => toSpeech(introduction(g), 2000)),
    ...followUps.lines,
    ...followUps.questions,
    welcomeBack(),
    ...tourSteps().map((s) => toSpeech(s.text, 2000)),
  ]
  const chunks = [...new Set(lines.flatMap(speechChunks))]

  // Lines saved by an earlier run load straight away, even before the model is ready.
  await mkdir(DISK_CACHE, { recursive: true })
  const missing = []
  for (const c of chunks) {
    const saved = await readFile(diskPath(keyFor(c))).catch(() => null)
    if (saved) fixed.set(keyFor(c), saved)
    else missing.push(c)
  }
  if (!missing.length) return console.log(`[voice-agent] ${chunks.length} fixed lines loaded from disk`)

  await loadModel()
  if (!tts) return
  const started = Date.now()
  await Promise.all(missing.map((c) => synthesize(c, { prepare: true }).catch(() => {})))
  console.log(`[voice-agent] prepared ${missing.length} of ${chunks.length} fixed lines in ${Math.round((Date.now() - started) / 1000)}s`)
}

// The model loads once, in the background, as soon as the server starts.
let tts = null
let loading = null
function loadModel() {
  if (!loading && enabled()) {
    loading = import('kokoro-js')
      .then(({ KokoroTTS }) => KokoroTTS.from_pretrained(MODEL, { dtype: process.env.KOKORO_DTYPE || 'fp16', device: 'cpu' }))
      .then((model) => {
        tts = model
        console.log('[voice-agent] Kokoro voice ready')
      })
      .catch((err) => console.error('[voice-agent] Kokoro failed to load:', err?.message ?? err))
  }
  return loading
}

// 16-bit PCM WAV: half the size of the float WAV Kokoro produces, and plays everywhere.
function wav16(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples.length * 2, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(samples.length * 2, 40)
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2)
  }
  return buf
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

// warming: true tells the browser to use its own voice for now but try again on the next line.
const fallback = (res, status, error, warming = false) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ fallback: true, warming, error }))
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
  if (!enabled()) return fallback(res, 503, 'Server voice is turned off')
  const headers = { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }
  const ready = cached(keyFor(text))
  if (ready) {
    res.writeHead(200, headers)
    return res.end(ready)
  }
  if (!tts) {
    loadModel()
    return fallback(res, 503, 'Voice is still loading', true)
  }
  if (pending() >= MAX_QUEUE) return fallback(res, 503, 'Voice is busy', true)
  if (overBudget(req.socket?.remoteAddress || 'unknown', text.length)) return fallback(res, 429, 'Voice limit reached')

  let gone = false
  res.on('close', () => (gone = true))
  try {
    const audio = await synthesize(text, { cancelled: () => gone })
    if (!audio || gone) return
    res.writeHead(200, headers)
    res.end(audio)
  } catch (err) {
    console.error('[voice-agent]', err?.message ?? err)
    if (!res.headersSent) fallback(res, 503, 'Voice unavailable')
  }
}

// Start as soon as the server imports this module, so the voice is ready by the time a visitor
// opens VINCE: load saved fixed lines, then the model, then prepare any lines still missing.
if (enabled()) {
  loadModel()
  prepareFixedLines().catch((err) => console.error('[voice-agent] preparing lines failed:', err?.message ?? err))
}
