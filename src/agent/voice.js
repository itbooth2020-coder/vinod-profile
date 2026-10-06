// Browser speech for the voice assistant: synthesis (VINCE's voice) and recognition (the
// visitor's questions). Both are optional; the assistant still works by text without them.

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
export const canListen = Boolean(Recognition)
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

// VINCE speaks like JARVIS: a British (RP) male voice with calm, crisp, measured delivery.
// The best match differs by browser, so every installed English voice is scored:
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

// The chosen voice is kept for the whole visit, so the introduction, answers and the tour
// narration all use the same one.
let chosen
function pickVoice() {
  if (chosen) return chosen
  const voices = window.speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang))
  if (!voices.length) return null
  chosen = voices.reduce((best, v) => (score(v) > score(best) ? v : best))
  return chosen
}

// Natural (neural) voices already sound composed; the older robotic ones get a slightly lower
// pitch and slower pace to approach JARVIS's measured delivery.
const tuning = (v) => (v && NATURAL.test(v.name) ? { rate: 1.0, pitch: 0.95 } : { rate: 0.96, pitch: 0.86 })

// Browsers load their voice list after the page; until it arrives they speak in a default voice
// (often a US female one). Wait for it, briefly, before VINCE's first words.
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
if (canSpeak) whenVoicesReady()

export const voiceName = () => (canSpeak ? pickVoice()?.name ?? '' : '')

// iOS Safari only allows speech that starts inside a tap; call this from click handlers so
// later answers (spoken after a network round trip) are allowed too.
export function unlockSpeech() {
  if (!canSpeak || unlockSpeech.done) return
  unlockSpeech.done = true
  const u = new SpeechSynthesisUtterance('')
  u.volume = 0
  window.speechSynthesis.speak(u)
}

// Chrome stops long utterances after ~15 seconds, so speech is queued sentence by sentence.
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
// cancelled speech (browsers fire 'end' or 'error' on cancel) are ignored.
let generation = 0

export function stopSpeaking() {
  generation++
  if (canSpeak) window.speechSynthesis.cancel()
}

export function speak(text, { onBoundary, onEnd } = {}) {
  stopSpeaking()
  const mine = generation
  const done = () => mine === generation && onEnd?.()
  if (!canSpeak || !text.trim()) return done()
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
    setTimeout(done, Math.max(0, text.split(/\s+/).length * 330 - 3000))
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
