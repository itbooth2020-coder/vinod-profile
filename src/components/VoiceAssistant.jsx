import { useEffect, useRef, useState } from 'react'
import { profile } from '../data.js'
import { askAgent } from '../agent/askAgent.js'
import { canListen, canSpeak, listen, speak, stopSpeaking, unlockSpeech, voiceName } from '../agent/voice.js'
import { NAME, EXPANSION, acknowledge, introduction, welcomeBack, nextQuestions, markAsked, followUpLine, toSpeech, tourSteps } from '../agent/vince.js'
import ArcOrb from './ArcOrb.jsx'
import RichText from './RichText.jsx'

// VINCE, the voice assistant: a floating launcher that opens a HUD panel. VINCE introduces
// himself, answers spoken or typed questions through the profile agent, reads the answers
// aloud, then suggests what to ask next. He can also narrate a guided tour of the page.
// Other components open him with: window.dispatchEvent(new Event('vince:open')).

const STATUS = { idle: 'Standing by', listening: 'Listening…', thinking: 'Accessing records…', speaking: 'Speaking' }
const MUTE_KEY = 'vince-muted'
const HINT_KEY = 'vince-hint-seen'
const FIRST = profile.firstName.split(' ')[0]
const readingTime = (text) => Math.max(2500, text.split(/\s+/).length * 330)
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function stored(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function store(key, on, storage = localStorage) {
  try {
    storage.setItem(key, on ? '1' : '0')
  } catch {
    /* storage unavailable: the preference lasts for this visit only */
  }
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('idle')
  const [muted, setMuted] = useState(() => stored(MUTE_KEY))
  const [messages, setMessages] = useState([])
  const [interim, setInterim] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [touring, setTouring] = useState(false)
  const [input, setInput] = useState('')
  const [hint, setHint] = useState(false)

  const energy = useRef(0) // pulses the orb on each spoken word
  const asked = useRef(new Set())
  const history = useRef([])
  const greeted = useRef(false)
  const handsFree = useRef(false) // after the visitor first uses the mic, VINCE listens after each answer
  const stopListening = useRef(null)
  const abort = useRef(null)
  const tour = useRef(null)
  const timer = useRef(0)
  const mutedRef = useRef(muted)
  const showRef = useRef(null)
  const panelRef = useRef(null)
  const launcherRef = useRef(null)
  const logRef = useRef(null)
  const wasOpen = useRef(false)

  const addVince = (text) => setMessages((m) => [...m, { role: 'vince', text }])

  // Stops whatever VINCE is doing: speaking, waiting, listening or fetching an answer.
  const halt = () => {
    stopSpeaking()
    clearTimeout(timer.current)
    stopListening.current?.()
    stopListening.current = null
    abort.current?.abort()
    abort.current = null
  }

  // Speaks text, or, with the voice off, waits as long as reading it takes, then calls onDone.
  const voice = (text, onDone) => {
    clearTimeout(timer.current)
    if (mutedRef.current || !canSpeak) {
      setMode('idle')
      if (onDone) timer.current = setTimeout(onDone, readingTime(text))
      return
    }
    setMode('speaking')
    speak(text, {
      onBoundary: () => (energy.current = 1),
      onEnd: () => {
        setMode('idle')
        onDone?.()
      },
    })
  }

  const autoListen = () => {
    if (handsFree.current && canListen && !mutedRef.current) startListening()
  }

  const clearFocus = () => document.querySelector('.tour-focus')?.classList.remove('tour-focus')

  const stopTour = () => {
    if (!tour.current) return
    clearFocus()
    tour.current = null
    setTouring(false)
  }

  const runTour = (i) => {
    const steps = tour.current?.steps
    if (!steps) return
    clearFocus()
    if (i >= steps.length) {
      tour.current = null
      setTouring(false)
      setSuggestions(nextQuestions('', '', asked.current))
      return autoListen()
    }
    tour.current.i = i
    const el = document.getElementById(steps[i].target)
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' })
      el.classList.add('tour-focus')
    }
    addVince(steps[i].text)
    voice(toSpeech(steps[i].text, 2000), () => tour.current && runTour(i + 1))
  }

  const startTour = () => {
    unlockSpeech()
    halt()
    setSuggestions([])
    tour.current = { steps: tourSteps(), i: 0 }
    setTouring(true)
    runTour(0)
  }

  const ask = async (raw) => {
    const question = raw.trim()
    if (!question) return
    // "Take the tour", or a plain "yes" to the introduction's offer, starts the tour.
    if (/\btour\b|show me around/i.test(question) || (!history.current.length && /^(yes|yeah|yep|sure|ok(ay)?|please|go ahead)\b/i.test(question))) {
      setInput('')
      setMessages((m) => [...m, { role: 'you', text: question }])
      return startTour()
    }
    halt()
    stopTour()
    markAsked(asked.current, question)
    setInput('')
    setSuggestions([])
    setMessages((m) => [...m, { role: 'you', text: question }, { role: 'vince', text: '', rich: true }])
    setMode('thinking')

    let answer = ''
    const setAnswer = (text) =>
      setMessages((m) => {
        const next = m.slice()
        next[next.length - 1] = { ...next[next.length - 1], text }
        return next
      })
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      await askAgent(question, history.current, {
        voice: true,
        signal: ctrl.signal,
        onStatus: () => {},
        onSource: () => {},
        onText: (chunk) => setAnswer((answer += chunk)),
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setAnswer((answer = 'Something went wrong on my side. Please try again.'))
    }
    if (ctrl.signal.aborted) return
    abort.current = null

    history.current = [...history.current, { role: 'user', content: question }, { role: 'assistant', content: answer }].slice(-10)
    const next = nextQuestions(question, answer, asked.current)
    const invite = followUpLine(next)
    setSuggestions(next)
    addVince(invite)
    voice(`${acknowledge()} ${toSpeech(answer)} ${invite}`, autoListen)
  }

  function startListening() {
    halt()
    stopTour()
    setInterim('')
    setMode('listening')
    try {
      stopListening.current = listen({
        onInterim: setInterim,
        onFinal: (text) => {
          stopListening.current = null
          ask(text)
        },
        onEnd: () => {
          stopListening.current = null
          setInterim('')
          setMode((m) => (m === 'listening' ? 'idle' : m))
        },
        onError: (err) => {
          if (err === 'not-allowed' || err === 'service-not-allowed') {
            handsFree.current = false
            addVince("I can't hear you: microphone access is blocked. You can type your question instead.")
          }
        },
      })
    } catch {
      setMode('idle')
    }
  }

  // The Stop button: ends speech, listening, a pending answer, hands-free mode and the tour.
  // VINCE then stands by until the visitor asks something new.
  const stopAll = () => {
    handsFree.current = false
    halt()
    stopTour()
    setInterim('')
    setMode('idle')
    setSuggestions((s) => (s.length ? s : nextQuestions('', '', asked.current)))
    setMessages((m) => {
      const last = m[m.length - 1]
      return last?.rich && !last.text ? [...m.slice(0, -1), { role: 'vince', text: 'Stopped.' }] : m
    })
  }

  const toggleMic = () => {
    unlockSpeech()
    if (mode === 'listening') {
      stopAll()
    } else {
      handsFree.current = true
      startListening()
    }
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    mutedRef.current = next
    store(MUTE_KEY, next)
    if (next) {
      stopSpeaking()
      setMode((m) => (m === 'speaking' ? 'idle' : m))
      // Speech callbacks stop once muted, so keep a running tour moving on reading time.
      if (tour.current) {
        const i = tour.current.i
        timer.current = setTimeout(() => tour.current && runTour(i + 1), 1500)
      }
    }
  }

  const show = () => {
    unlockSpeech()
    setHint(false)
    setOpen(true)
    if (!greeted.current) {
      greeted.current = true
      const text = introduction()
      setMessages([{ role: 'vince', text }])
      setSuggestions(nextQuestions('', '', asked.current))
      voice(toSpeech(text, 2000))
    } else if (!tour.current) {
      const text = welcomeBack()
      addVince(text)
      voice(text)
    }
  }

  const close = () => {
    halt()
    stopTour()
    setMode('idle')
    setInterim('')
    setOpen(false)
  }

  useEffect(() => {
    showRef.current = show
  })

  useEffect(() => {
    const onOpen = () => showRef.current()
    window.addEventListener('vince:open', onOpen)
    return () => {
      window.removeEventListener('vince:open', onOpen)
      halt()
      clearFocus()
    }
  }, [])

  // A one-time nudge per browser session, a few seconds after the page loads.
  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(HINT_KEY) === '1'
    } catch {
      /* treat as unseen */
    }
    if (seen) return
    const id = setTimeout(() => {
      setHint(true)
      store(HINT_KEY, true, sessionStorage)
    }, 6000)
    return () => clearTimeout(id)
  }, [])

  // Focus moves into the panel when it opens and back to the launcher when it closes.
  useEffect(() => {
    if (open) panelRef.current?.focus()
    else if (wasOpen.current) launcherRef.current?.focus()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, open])

  const onSubmit = (e) => {
    e.preventDefault()
    unlockSpeech()
    ask(input)
  }

  return (
    <>
      {!open && (
        <div className="vince-dock">
          {hint && (
            <p className="vince-hint" role="status">
              Hi, I'm VINCE. Ask me anything about {FIRST}, out loud or by typing.
              <button type="button" onClick={() => setHint(false)} aria-label="Dismiss">✕</button>
            </p>
          )}
          <button ref={launcherRef} type="button" className="vince-launch" onClick={show} aria-haspopup="dialog">
            <span className="vince-launch__orb" aria-hidden="true" />
            <span>Ask VINCE</span>
          </button>
        </div>
      )}

      {open && (
        <section
          ref={panelRef}
          className={`vince${touring ? ' vince--touring' : ''}`}
          role="dialog"
          aria-labelledby="vince-title"
          aria-describedby="vince-sub"
          tabIndex={-1}
          onKeyDown={(e) => e.key === 'Escape' && close()}
        >
          <header className="vince__head">
            <div>
              <h2 id="vince-title" className="vince__title">{NAME}</h2>
              <p id="vince-sub" className="vince__sub">{EXPANSION}</p>
            </div>
            <div className="vince__tools">
              {canSpeak && (
                <button type="button" className="vince__icon" onClick={toggleMute} aria-pressed={!muted} aria-label="Voice" title={voiceName() ? `Voice: ${voiceName()}` : 'Voice'}>
                  <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
                </button>
              )}
              <button type="button" className="vince__icon" onClick={close} aria-label="Close VINCE">
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </header>

          <div className="vince__stage">
            <ArcOrb state={mode} energyRef={energy} />
            <p className="vince__status" role="status">{interim ? `“${interim}”` : STATUS[mode]}</p>
            {(mode !== 'idle' || touring) && (
              <button type="button" className="vince__stop" onClick={stopAll} aria-label="Stop VINCE">
                <span aria-hidden="true">■</span> Stop
              </button>
            )}
          </div>

          <div className="vince__log" ref={logRef} role="log" aria-label="Conversation with VINCE">
            {messages.map((m, i) => (
              <div key={i} className={`vmsg vmsg--${m.role}`}>
                <small>{m.role}</small>
                {m.rich ? (
                  m.text ? <RichText text={m.text} /> : <p className="vmsg__wait">Accessing records…</p>
                ) : (
                  <p>{m.text}</p>
                )}
              </div>
            ))}
          </div>

          {touring ? (
            <div className="vince__chips" role="group" aria-label="Tour controls">
              <button type="button" onClick={() => (halt(), runTour(tour.current.i + 1))}>Next stop ›</button>
              <button type="button" onClick={stopAll}>End tour</button>
            </div>
          ) : (
            <div className="vince__chips" role="group" aria-label="Suggested questions">
              {suggestions.map((q) => (
                <button key={q} type="button" onClick={() => (unlockSpeech(), ask(q))} disabled={mode === 'thinking'}>
                  {q}
                </button>
              ))}
              <button type="button" className="vince__tourbtn" onClick={startTour} disabled={mode === 'thinking'}>
                ▶ Guided tour
              </button>
            </div>
          )}

          <form className="vince__form" onSubmit={onSubmit}>
            {canListen && (
              <button
                type="button"
                className={`vince__mic${mode === 'listening' ? ' is-on' : ''}`}
                onClick={toggleMic}
                aria-pressed={mode === 'listening'}
                aria-label={mode === 'listening' ? 'Stop listening' : 'Ask by voice'}
              >
                <MicIcon />
              </button>
            )}
            <label htmlFor="vince-input" className="sr-only">Ask VINCE about {FIRST}</label>
            <input
              id="vince-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={canListen ? 'Speak or type a question…' : 'Type a question…'}
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={!input.trim() || mode === 'thinking'}>Send</button>
          </form>
          {canListen && <p className="vince__note">Voice input uses your browser's speech service.</p>}
        </section>
      )}
    </>
  )
}
