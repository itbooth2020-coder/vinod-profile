// Speech for the voice assistant.
// VINCE's voice: ElevenLabs audio from /api/speak (server/voiceAgent.js), played through a
// JARVIS-style Web Audio effect chain. When that isn't available (no key, quota used up,
// static hosting), the browser's built-in speech takes over for the rest of the visit.
// Listening: the browser's speech recognition. Everything here is optional; the assistant
// still works by text without it.

const hasWindow = typeof window !== 'undefined'
const Recognition = hasWindow ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const AudioCtx = hasWindow ? window.AudioContext || window.webkitAudioContext : null
const hasSynthesis = hasWindow && 'speechSynthesis' in window
export const canListen = Boolean(Recognition)
export const canSpeak = Boolean(AudioCtx) || hasSynthesis

const readingTime = (text) => Math.max(2500, text.split(/\s+/).length * 330)

// ---------------------------------------------------------------------------------------------
// JARVIS-style processing: a little presence and air, a gentle chorus for a synthetic shimmer,
// and a short room reverb, blended in subtly under the dry voice.

let ctx = null
let input = null
let analyser = null

function audio() {
  if (ctx || !AudioCtx) return ctx
  ctx = new AudioCtx()
  const filter = (type, frequency, gain = 0, Q = 0.7) => {
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = frequency
    f.gain.value = gain
    f.Q.value = Q
    return f
  }
  const gain = (value) => {
    const g = ctx.createGain()
    g.gain.value = value
    return g
  }

  input = gain(1)
  const highpass = filter('highpass', 90)
  const presence = filter('peaking', 3000, 3, 1)
  const air = filter('highshelf', 8000, 2)
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 3
  comp.attack.value = 0.005
  comp.release.value = 0.2
  input.connect(highpass).connect(presence).connect(air).connect(comp)

  const out = gain(0.95)
  comp.connect(gain(1)).connect(out) // dry

  // Shimmer: a short delay swept slowly by an oscillator (a gentle chorus).
  const chorus = ctx.createDelay(0.05)
  chorus.delayTime.value = 0.012
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.3
  lfo.connect(gain(0.0025)).connect(chorus.delayTime)
  lfo.start()
  comp.connect(chorus).connect(gain(0.16)).connect(out)

  // Room: a synthetic impulse response for the faint sense of a large space.
  const room = ctx.createConvolver()
  const len = Math.round(ctx.sampleRate * 0.7)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2)
  }
  room.buffer = ir
  comp.connect(room).connect(gain(0.1)).connect(out)

  analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  out.connect(analyser).connect(ctx.destination)
  return ctx
}

// ---------------------------------------------------------------------------------------------
// Fallback: the browser's built-in voices. VINCE prefers a British (RP) male voice:
//   Edge: "Microsoft Ryan/Thomas Online (Natural) – English (United Kingdom)"
//   Chrome: "Google UK English Male"   Safari/macOS/iOS: "Daniel", "Arthur", "Oliver"
//   Windows: "Microsoft George – English (United Kingdom)"
const BRITISH_MALE = /\b(ryan|thomas|george|arthur|oliver|daniel|alfie|elliot|noah|ethan|uk english male)\b/i
const OTHER_MALE = /\b(male|guy|davis|christopher|eric|andrew|brian|roger|steffan|william|liam|david|mark|alex|fred|tom|aaron)\b/i
const FEMALE = /\b(female|sonia|libby|maisie|hazel|susan|kate|serena|martha|stephanie|zira|aria|jenny|samantha|karen|moira|tessa|fiona|victoria|allison|ava|emma|olivia|amy)\b/i
const NATURAL = /natural|neural|online|premium|enhanced/i

function score(v) {
  let s = 0
  if (/en[-_]GB/i.test(v.lang)) s += 50
  else if (/en[-_](AU|IE|NZ)/i.test(v.lang)) s += 15
  if (BRITISH_MALE.test(v.name)) s += 40
  else if (OTHER_MALE.test(v.name)) s += 20
  if (FEMALE.test(v.name)) s -= 80
  if (NATURAL.test(v.name)) s += 15
  return s
}

// The chosen voice is kept for the whole visit, so every line sounds the same.
let chosen
function pickVoice() {
  if (chosen || !hasSynthesis) return chosen
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang))
  if (!voices.length) return null
  chosen = voices.reduce((best, v) => (score(v) > score(best) ? v : best))
  return chosen
}

// Natural (neural) voices already sound composed; older robotic ones get a slightly lower
// pitch and slower pace.
const tuning = (v) => (v && NATURAL.test(v.name) ? { rate: 1.0, pitch: 0.95 } : { rate: 0.96, pitch: 0.86 })

// Browsers load their voice list after the page; until it arrives they speak in a default voice.
let voicesReady
function whenVoicesReady() {
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      if (window.speechSynthesis.getVoices().length) return resolve()
      const t = setTimeout(resolve, 1500)
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        () => {
          clearTimeout(t)
          resolve()
        },
        { once: true },
      )
    })
  }
  return voicesReady
}
if (hasSynthesis) whenVoicesReady()

// ---------------------------------------------------------------------------------------------

// 'unknown' until the first clip; 'on' once ElevenLabs has answered; 'off' after a failure.
let cloud = AudioCtx ? 'unknown' : 'off'

export const voiceName = () => (cloud === 'on' ? 'ElevenLabs, with JARVIS-style processing' : pickVoice()?.name ?? '')

// Browsers only allow audio that starts inside a tap or click. Call this from click handlers
// so answers spoken later (after a network round trip) are allowed too.
export function unlockSpeech() {
  const ac = audio()
  if (ac?.state === 'suspended') ac.resume()
  if (unlockSpeech.done) return
  unlockSpeech.done = true
  if (ac) {
    const src = ac.createBufferSource()
    src.buffer = ac.createBuffer(1, 1, 22050)
    src.connect(ac.destination)
    src.start()
  }
  if (hasSynthesis) {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  }
}

// Speech is split into sentence-sized pieces: Chrome stops long utterances after ~15 seconds,
// and ElevenLabs clips arrive sooner, so playback starts while later sentences are on the way.
function sentences(text) {
  const parts = text.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || [text]
  const out = []
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    if (out.length && (out[out.length - 1] + ' ' + p).length < 180) out[out.length - 1] += ' ' + p
    else out.push(p)
  }
  return out
}

// Each speak() call gets a generation number; stopSpeaking() bumps it, so callbacks from
// cancelled speech are ignored.
let generation = 0
const active = { abort: null, sources: new Set() }

export function stopSpeaking() {
  generation++
  if (hasSynthesis) window.speechSynthesis.cancel()
  active.abort?.abort()
  active.abort = null
  for (const s of active.sources) {
    try {
      s.stop()
    } catch {
      /* already stopped */
    }
  }
  active.sources.clear()
}

// Speaks text, then calls onEnd. onLevel(0..1) follows the voice's loudness (ElevenLabs);
// onBoundary fires on each word (built-in voices).
export function speak(text, { onBoundary, onLevel, onEnd } = {}) {
  stopSpeaking()
  const mine = generation
  const done = () => mine === generation && onEnd?.()
  if (!text.trim()) return done()
  if (cloud !== 'off' && audio()) return speakCloud(text, mine, done, { onBoundary, onLevel })
  speakBrowser(text, mine, done, onBoundary)
}

async function fetchClip(text, signal) {
  const res = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  })
  if (!res.ok || !(res.headers.get('content-type') || '').includes('audio')) throw new Error('voice unavailable')
  return ctx.decodeAudioData(await res.arrayBuffer())
}

function play(buffer) {
  return new Promise((resolve) => {
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(input)
    src.onended = () => {
      active.sources.delete(src)
      resolve()
    }
    active.sources.add(src)
    src.start()
  })
}

async function speakCloud(text, mine, done, { onBoundary, onLevel }) {
  if (ctx.state === 'suspended') ctx.resume()
  const ctrl = new AbortController()
  active.abort = ctrl
  const parts = sentences(text)
  // Request every sentence at once; each is usually ready before the one before it ends.
  const clips = parts.map((p) => fetchClip(p, ctrl.signal))
  clips.forEach((c) => c.catch(() => {}))

  // Feed the orb the real loudness of the voice.
  const samples = new Uint8Array(analyser.fftSize)
  const meter = () => {
    if (mine !== generation) return
    analyser.getByteTimeDomainData(samples)
    let sum = 0
    for (const v of samples) sum += ((v - 128) / 128) ** 2
    onLevel?.(Math.min(1, Math.sqrt(sum / samples.length) * 5))
    requestAnimationFrame(meter)
  }
  requestAnimationFrame(meter)

  for (let i = 0; i < parts.length; i++) {
    let buffer
    try {
      buffer = await clips[i]
    } catch {
      if (mine !== generation) return
      // ElevenLabs isn't available: use the browser's voice from here on.
      cloud = 'off'
      ctrl.abort()
      return speakBrowser(parts.slice(i).join(' '), mine, done, onBoundary)
    }
    if (mine !== generation) return
    cloud = 'on'
    await play(buffer)
    if (mine !== generation) return
  }
  done()
}

function speakBrowser(text, mine, done, onBoundary) {
  if (!hasSynthesis) {
    setTimeout(done, readingTime(text))
    return
  }
  whenVoicesReady().then(() => mine === generation && queueSpeech(text, mine, done, onBoundary))
}

function queueSpeech(text, mine, done, onBoundary) {
  const voice = pickVoice()
  const { rate, pitch } = tuning(voice)
  const queue = sentences(text)
  // Some browsers (no installed voices, blocked audio) never start speaking; carry on without it.
  let started = false
  let gaveUp = false
  setTimeout(() => {
    if (started || mine !== generation) return
    gaveUp = true
    window.speechSynthesis.cancel()
    // Leave the caption up for about as long as reading it takes.
    setTimeout(done, Math.max(0, readingTime(text) - 3000))
  }, 3000)
  queue.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk)
    u.onstart = () => (started = true)
    if (voice) {
      u.voice = voice
      u.lang = voice.lang
    }
    u.rate = rate
    u.pitch = pitch
    u.onboundary = () => mine === generation && onBoundary?.()
    if (i === queue.length - 1) {
      u.onend = () => !gaveUp && done()
      u.onerror = () => !gaveUp && done()
    }
    window.speechSynthesis.speak(u)
  })
}

// One utterance from the microphone. Returns a stop function.
export function listen({ onInterim, onFinal, onEnd, onError }) {
  const rec = new Recognition()
  rec.lang = /^en/i.test(navigator.language) ? navigator.language : 'en-US'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    onInterim?.(finalText + interim)
  }
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => {
    if (finalText.trim()) onFinal?.(finalText.trim())
    onEnd?.()
  }
  rec.start()
  return () => rec.abort()
}
