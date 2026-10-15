import { useEffect, useRef, useState } from 'react'
import { profile, suggestedPrompts } from '../data.js'
import { askAgent, liveAgent } from '../agent/askAgent.js'
import RichText from './RichText.jsx'

const GREETING = `Hi! I'm ${profile.firstName.split(' ')[0]}'s profile assistant. I answer questions about his experience, projects, skills and education from his resume${liveAgent ? ', with live AI answers when available' : ''}, with **photos, tables and charts**.`
const SOURCES = { live: 'Claude · resume + LinkedIn', local: 'resume search · offline' }

export default function PromptConsole() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  // Offline until askAgent reports a live answer (static hosting has no /api/ask).
  const [source, setSource] = useState('local')
  const logRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const stoppedRef = useRef(false) // set by the Stop button

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, status])

  // fromInput: the question was typed, so focus goes back to the field afterwards. A suggestion
  // chip keeps focus, so keyboard users can try the next chip and phones don't open the keyboard.
  const ask = async (raw, { fromInput = false } = {}) => {
    const question = raw.trim()
    if (!question || busy) return
    const history = messages.slice(1).filter((m) => m.content)
    setInput('')
    setBusy(true)
    setStatus('thinking')
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])

    const updateLast = (patch) =>
      setMessages((m) => {
        const next = m.slice()
        next[next.length - 1] = { ...next[next.length - 1], ...patch }
        return next
      })

    const appendText = (chunk) => {
      setStatus('')
      setMessages((m) => {
        const next = m.slice()
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, content: last.content + chunk }
        return next
      })
    }

    abortRef.current = new AbortController()
    try {
      await askAgent(question, history, {
        onStatus: setStatus,
        onText: appendText,
        onSource: setSource,
        // A fallback model took over mid-answer: start again rather than splice two answers.
        onReset: () => updateLast({ content: '' }),
        // sig lets the live agent trust this answer as history; sources is shown under it.
        onDone: ({ sig, sources }) => updateLast({ sig, sources }),
        signal: abortRef.current.signal,
      })
    } catch (err) {
      if (err.name !== 'AbortError') appendText('Something went wrong. Please try again.')
      else if (stoppedRef.current) appendText('\n\nStopped.')
    } finally {
      setBusy(false)
      setStatus('')
      if (fromInput || stoppedRef.current) inputRef.current?.focus()
      stoppedRef.current = false
    }
  }

  // Stops a streaming answer: what has arrived so far stays, and focus returns to the field.
  const stop = () => {
    stoppedRef.current = true
    abortRef.current?.abort()
  }

  const onSubmit = (e) => {
    e.preventDefault()
    ask(input, { fromInput: true })
  }

  return (
    <div className="card chat" id="console">
      <h3>Prompt console</h3>
      <div className="log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation" aria-busy={busy}>
        {messages.map((m, i) => {
          const streaming = busy && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>
              <small>{m.role === 'user' ? 'you' : 'profile-agent'}</small>
              {m.role === 'user' ? <span className="msg__text">{m.content}</span> : <RichText text={m.content} />}
              {m.sources?.length > 0 && <p className="msg__src">Source: {m.sources.join(' and ')}</p>}
              {streaming && (
                <>
                  {status && <span className="msg__status"> {status}…</span>}
                  <span className="caret" aria-hidden="true" />
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="metrics">
        <span>source: {SOURCES[source]}</span>
      </div>
      <form className="prompt" onSubmit={onSubmit}>
        <label htmlFor="prompt-input" className="sr-only">Ask a question about {profile.firstName}'s profile</label>
        <span className="prompt__sigil" aria-hidden="true">&gt;</span>
        <input
          id="prompt-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${profile.firstName.split(' ')[0]}'s experience, projects, skills…`}
          maxLength={500}
          autoComplete="off"
        />
        {busy ? (
          <button type="button" onClick={stop}>
            <span aria-hidden="true">■</span> Stop
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>Ask</button>
        )}
      </form>
      <div className="chips" role="group" aria-label="Suggested prompts">
        {/* aria-disabled, not disabled, while busy: a disabled button drops keyboard focus. ask() ignores the press. */}
        {suggestedPrompts.map((q) => (
          <button key={q} type="button" onClick={() => ask(q)} aria-disabled={busy || undefined}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
