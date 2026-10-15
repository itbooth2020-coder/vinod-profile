// VINCE's voice: free, open-source text-to-speech with Kokoro (Apache-2.0), mounted at /api/speak.
// Runs on this server's CPU: no API key, no quota, no cost. The model (~310 MB at fp32) downloads
// from Hugging Face on first start and is cached; it loads in the background when the server
// starts. The browser posts one sentence at a time and plays the WAV through its JARVIS-style
// effect chain (src/agent/voice.js). While the model is loading, or if the voice is turned off,
// the endpoint answers 503 and the browser uses its built-in voice instead.
//
// Environment (.env), all optional:
//   VINCE_VOICE=off   turn the server voice off (the browser voice is used)
//   KOKORO_VOICE      default bm_george (British male); bm_fable is a lighter alternative
//   KOKORO_DTYPE      default fp32. fp16 is smaller but can produce NaN (silent) audio on CPU
//                     (PERF-BE-001); q8 is smaller still but slower on CPU
//   KOKORO_SPEED      default 1.0
//   TRUST_PROXY       see server/http.js (per-IP limits)

import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { TooLarge, allowedOrigin, clientIp, isJson, json, methodNotAllowed, pruned, readJson } from './http.js'

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'
// Prepared fixed lines are saved here, so a restart doesn't have to generate them again.
export const DISK_CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.voice-cache')
const MAX_TEXT = 400
const MAX_QUEUE = 24
const JOB_TIMEOUT_MS = 20_000 // one sentence; a stuck synthesis is abandoned so the queue moves on

// Limits, so a public deployment's CPU can't be used as a free text-to-speech service.
const WINDOW_MS = 10 * 60 * 1000
const MAX_CHARS_PER_IP = 4000
const perIp = new Map()
const checkPerIp = pruned(perIp, (entries) => !entries.some((e) => Date.now() - e.t < WINDOW_MS))

function overBudget(ip, n) {
  checkPerIp()
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
const dtype = () => process.env.KOKORO_DTYPE || 'fp32'
export const keyFor = (text) => `${voice()}|${speed()}|${text}`

// Generated lines are kept in memory. VINCE's fixed lines, prepared at start-up, are kept for
// good; other lines are dropped oldest-first.
const fixed = new Map()
const cache = new Map()
const CACHE_MAX = 200
const cached = (key) => fixed.get(key) ?? cache.get(key)
export const diskPath = (key) => path.join(DISK_CACHE, createHash('sha1').update(key).digest('hex') + '.wav')
function remember(key, audio) {
  cache.set(key, audio)
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
}

// ---------------------------------------------------------------------------------------------
// Audio checks (PERF-BE-001). Kokoro at fp16 can return NaN samples; clamped and written as 16-bit
// PCM they become zeros, a clip of normal length that plays as silence. A clip is only used, cached
// or saved when every sample is finite and its RMS level is above about -80 dBFS.
const MIN_RMS = 1e-4

export function audible(samples) {
  if (!samples?.length) return false
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]
    if (!Number.isFinite(v)) return false
    sum += v * v
  }
  return Math.sqrt(sum / samples.length) > MIN_RMS
}

// The same check for a saved 16-bit WAV (as written by wav16 below).
export function audibleWav(buf) {
  if (!Buffer.isBuffer(buf) || buf.length <= 44 || buf.toString('ascii', 0, 4) !== 'RIFF') return false
  const n = Math.floor((buf.length - 44) / 2)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(44 + i * 2) / 32768
  return audible(samples)
}

const withTimeout = (promise, ms, what) => {
  let id
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error(`${what} timed out after ${ms / 1000}s`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(id))
}

// Synthesizes one sentence, retrying once at fp32 when the output is NaN or silent. A line that is
// still silent throws, so it isn't cached and the browser speaks it with its own voice.
async function generate(text) {
  const run = (model) => withTimeout(model.generate(text, { voice: voice(), speed: speed() }), JOB_TIMEOUT_MS, 'Kokoro synthesis')
  let out = await run(tts)
  if (!audible(out.audio)) {
    console.warn(`[voice-agent] silent or NaN audio at ${dtype()}, retrying at fp32: "${text.slice(0, 60)}"`)
    out = await run(await fp32Model())
    if (!audible(out.audio)) throw new Error('Kokoro produced silent audio')
  }
  return wav16(out.audio, out.sampling_rate)
}

// One sentence at a time, since the CPU is the bottleneck. Visitors' requests always go first
// and run in arrival order, so a line's first sentence is ready first; preparing fixed lines
// only uses the time in between. A job that times out fails and the queue moves on (PERF-BE-004);
// ONNX can't be cancelled, so a truly stuck run keeps its CPU until it ends.
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
      const audio = await generate(job.text)
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
// for each time of day, the follow-up phrases and suggested questions, the tour, the 30-second
// brief's narration, then the domain graph explanations (PERF-BE-009).
export async function fixedLines() {
  const { GREETINGS, ACKNOWLEDGEMENTS, introduction, welcomeBack, tourSteps, toSpeech, followUpPieces, briefNarration, explainNode } =
    await import('../src/agent/vince.js')
  const { graphProjects, graphDomains } = await import('../src/data.js')
  const { speechChunks } = await import('../src/agent/chunks.js')
  const followUps = followUpPieces()

  // Every node the graph (GraphView.jsx buildTree) and the case studies can ask VINCE to explain.
  const verticals = [...new Set(graphProjects.map((p) => p.vertical))]
  const group = (type, label, match) => ({ type, label, children: graphProjects.filter(match).map((project) => ({ project })) })
  const nodes = [
    { type: 'root', label: 'Vinod', children: [] },
    ...verticals.map((v) => group('vertical', v, (p) => p.vertical === v)),
    ...graphDomains.map((d) => group('domain', d, (p) => p.domains.includes(d))),
    ...graphProjects.map((project) => ({ type: 'project', label: project.short, project })),
    ...[...new Set(graphProjects.flatMap((p) => p.tech))].map((t) => ({ type: 'tech', label: t, children: [] })),
  ]

  const lines = [
    ...ACKNOWLEDGEMENTS,
    ...GREETINGS.map((g) => toSpeech(introduction(g), 2000)),
    ...followUps.lines,
    ...followUps.questions,
    welcomeBack(),
    ...tourSteps().map((s) => toSpeech(s.text, 2000)),
    ...briefNarration().map((s) => s.speech),
    ...nodes.map((n) => toSpeech(explainNode(n), 900)),
  ]
  return [...new Set(lines.flatMap(speechChunks))]
}

async function prepareFixedLines() {
  const chunks = await fixedLines()

  // Lines saved by an earlier run load straight away, even before the model is ready. A saved clip
  // that is silent (from an fp16 NaN run) is deleted and generated again.
  await mkdir(DISK_CACHE, { recursive: true })
  const missing = []
  let removed = 0
  for (const c of chunks) {
    const file = diskPath(keyFor(c))
    const saved = await readFile(file).catch(() => null)
    if (saved && audibleWav(saved)) fixed.set(keyFor(c), saved)
    else {
      if (saved) {
        removed++
        await unlink(file).catch(() => {})
      }
      missing.push(c)
    }
  }
  if (removed) console.log(`[voice-agent] removed ${removed} silent saved lines; they will be generated again`)
  if (!missing.length) return console.log(`[voice-agent] ${chunks.length} fixed lines loaded from disk`)

  await loadModel()
  if (!tts) return
  const started = Date.now()
  const results = await Promise.all(missing.map((c) => synthesize(c, { prepare: true }).then(() => true, () => false)))
  const made = results.filter(Boolean).length
  console.log(`[voice-agent] prepared ${made} of ${missing.length} missing lines (${chunks.length} fixed lines) in ${Math.round((Date.now() - started) / 1000)}s`)
}

// The model loads once, in the background, as soon as the server starts.
let tts = null
let loading = null
const loadKokoro = (type) =>
  import('kokoro-js').then(({ KokoroTTS }) => KokoroTTS.from_pretrained(MODEL, { dtype: type, device: 'cpu' }))

function loadModel() {
  if (!loading && enabled()) {
    loading = loadKokoro(dtype())
      .then((model) => {
        tts = model
        console.log(`[voice-agent] Kokoro voice ready (${dtype()})`)
      })
      .catch((err) => console.error('[voice-agent] Kokoro failed to load:', err?.message ?? err))
  }
  return loading
}

// The fp32 model for retries: the main model when it already is fp32, otherwise loaded on first need.
let fp32 = null
const fp32Model = () => (dtype() === 'fp32' ? Promise.resolve(tts) : (fp32 ||= loadKokoro('fp32')))

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

// warming: true tells the browser to use its own voice for this line but try again on the next.
const fallback = (res, status, error, warming = false, headers = {}) => json(res, status, { fallback: true, warming, error }, headers)

// Node-style (req, res) handler, usable from Vite middleware or any Node HTTP server.
export async function handleSpeak(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res)
  // Same rules as /api/ask (PERF-BE-010): only JSON from this site's pages, so other sites can't use
  // this server's CPU for speech through simple (no-preflight) requests.
  if (!isJson(req)) return fallback(res, 415, 'Send JSON')
  if (!allowedOrigin(req)) return fallback(res, 403, 'Not allowed')
  let body
  try {
    body = await readJson(req, 8_000)
  } catch (err) {
    if (err instanceof TooLarge) return fallback(res, 413, 'Request too large', false, { Connection: 'close' })
    return fallback(res, 400, 'Invalid JSON')
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
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
  if (overBudget(clientIp(req), text.length)) return fallback(res, 429, 'Voice limit reached', false, { 'Retry-After': String(WINDOW_MS / 1000) })

  let gone = false
  res.on('close', () => (gone = true))
  try {
    const audio = await synthesize(text, { cancelled: () => gone })
    if (!audio || gone) return
    res.writeHead(200, headers)
    res.end(audio)
  } catch (err) {
    console.error('[voice-agent]', err?.message ?? err)
    // Only this line falls back to the browser voice (silent audio or a timeout); the next one tries again.
    if (!res.headersSent) fallback(res, 503, 'Voice unavailable for this line', true)
  }
}

// Start as soon as the server imports this module, so the voice is ready by the time a visitor
// opens VINCE: load saved fixed lines, then the model, then prepare any lines still missing.
// VOICE_AGENT_NO_START is for checks that import this module without starting Kokoro.
if (enabled() && !process.env.VOICE_AGENT_NO_START) {
  loadModel()
  prepareFixedLines().catch((err) => console.error('[voice-agent] preparing lines failed:', err?.message ?? err))
}
