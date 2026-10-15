import { useEffect, useRef, useState } from 'react'

// VINCE's floating launcher, without the assistant itself (PERF-FE-002). The launcher shows at
// once; the panel stack (VoiceAssistant.jsx with vince.js, voice.js, ArcOrb and RichText) loads
// when the browser is idle, or straight away on first use. 'vince:open', 'vince:explain' and
// 'vince:brief' sent before it has loaded are queued and replayed once it is listening.
// The markup matches the launcher in VoiceAssistant.jsx, so the swap doesn't move anything.

let Assistant = null
let loading = null
const load = () =>
  (loading ||= import('./VoiceAssistant.jsx').then(
    (m) => {
      Assistant = m.default
    },
    (err) => {
      loading = null // offline or a new deploy: try again on the next use
      throw err
    },
  ))

const QUEUED = ['vince:open', 'vince:explain', 'vince:brief']

// Browsers only allow speech that starts inside a tap or click, and the replayed event isn't one.
// The static site speaks with speechSynthesis, so prime it while the visitor's gesture is current.
function primeSpeech() {
  try {
    if (!('speechSynthesis' in window)) return
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch {
    /* speech is optional */
  }
}

export default function Vince() {
  const [ready, setReady] = useState(() => Boolean(Assistant))
  const queue = useRef([])
  const launcherFocused = useRef(false)

  useEffect(() => {
    if (ready) return
    let alive = true
    const go = () =>
      load().then(
        () => {
          if (!alive) return
          launcherFocused.current = document.activeElement?.classList.contains('vince-launch') ?? false
          setReady(true)
        },
        () => {},
      )
    const onEvent = (e) => {
      primeSpeech()
      queue.current.push(new CustomEvent(e.type, { detail: e.detail }))
      go()
    }
    QUEUED.forEach((type) => window.addEventListener(type, onEvent))
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(go, { timeout: 4000 })
      : setTimeout(go, 2000)
    return () => {
      alive = false
      QUEUED.forEach((type) => window.removeEventListener(type, onEvent))
      window.cancelIdleCallback ? window.cancelIdleCallback(idle) : clearTimeout(idle)
    }
  }, [ready])

  // Called once VoiceAssistant has added its listeners: replay what the visitor asked for, or keep
  // keyboard focus on the launcher if it was there when the static one was swapped out.
  // Deferred, so React's development double-run of effects has settled first.
  const onReady = () =>
    setTimeout(() => {
      const events = queue.current.splice(0)
      if (events.length) events.forEach((e) => window.dispatchEvent(e))
      else if (launcherFocused.current) document.querySelector('.vince-launch')?.focus()
      launcherFocused.current = false
    })

  if (ready) return <Assistant onReady={onReady} />

  return (
    <div className="vince-dock">
      <button
        type="button"
        className="vince-launch"
        aria-haspopup="dialog"
        data-vince-trigger
        onClick={() => window.dispatchEvent(new Event('vince:open'))}
      >
        <span className="vince-launch__orb" aria-hidden="true" />
        <span className="vince-launch__label">Ask VINCE</span>
      </button>
    </div>
  )
}
