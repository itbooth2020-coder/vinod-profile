import { useEffect, useRef, useState } from 'react'
import { loadVoice } from '../agent/voiceSafe.js'
import SectionBoundary from './SectionBoundary.jsx'
import { importAgain } from '../importAgain.js'

// VINCE's floating launcher, without the assistant itself (PERF-FE-002). The launcher shows at
// once; the panel stack (VoiceAssistant.jsx with vince.js, voice.js, ArcOrb and RichText) loads
// when the browser is idle, or straight away on first use. 'vince:open', 'vince:explain' and
// 'vince:brief' sent before it has loaded are queued and replayed once it is listening.
// The markup matches the launcher in VoiceAssistant.jsx, so the swap doesn't move anything.
// If the panel can't load (FUNC-014), a tap shows "VINCE couldn't load. Tap to retry." by the
// launcher and the next tap tries again (after a second failure, it reloads the page: the browser won't
// fetch a failed dependency again); the voice is optional (agent/voiceSafe.js): without it
// VINCE works by text.

let Assistant = null
let loading = null
const load = () =>
  (loading ||= Promise.all([importAgain(() => import('./VoiceAssistant.jsx')), loadVoice()]).then(
    ([m]) => {
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
  // '' or, when the visitor asked for VINCE and the panel didn't load, what a tap does next: 'retry' or 'reload'
  const [failed, setFailed] = useState('')
  const failures = useRef(0)
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
        () => {
          // Only worth saying when the visitor is waiting for him; their next tap tries again.
          if (!alive || !queue.current.length) return
          queue.current = []
          failures.current += 1
          setFailed(failures.current >= 2 ? 'reload' : 'retry')
        },
      )
    const onEvent = (e) => {
      setFailed('')
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

  // The note hides itself after a while; the launcher keeps working (each tap tries again).
  useEffect(() => {
    if (!failed) return
    const id = setTimeout(() => setFailed(''), 8000)
    return () => clearTimeout(id)
  }, [failed])

  const launcher = (note, onClick) => (
    <div className="vince-dock">
      {/* Always rendered (empty until needed), so screen readers announce the note when it appears. */}
      <p className={note ? 'vince-hint vince-hint--error' : 'sr-only'} role="status" id="vince-load-note">
        {note ? `VINCE couldn't load. Tap to ${note === 'reload' ? 'reload the page' : 'retry'}.` : ''}
      </p>
      <button
        type="button"
        className="vince-launch"
        aria-haspopup="dialog"
        aria-describedby={note ? 'vince-load-note' : undefined}
        data-vince-trigger
        onClick={onClick}
      >
        <span className="vince-launch__orb" aria-hidden="true" />
        <span className="vince-launch__label">Ask VINCE</span>
      </button>
    </div>
  )

  // A render error in the panel shows the launcher with the note; a tap remounts the panel.
  if (ready) {
    return (
      <SectionBoundary fallback={(retry) => launcher('retry', retry)}>
        <Assistant onReady={onReady} />
      </SectionBoundary>
    )
  }
  return launcher(failed, () => (failed === 'reload' ? window.location.reload() : window.dispatchEvent(new Event('vince:open'))))
}
