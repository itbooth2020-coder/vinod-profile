import { useEffect, useRef, useState } from 'react'
import { profile, suggestedPrompts } from '../data.js'
import { askAgent } from '../agent/askAgent.js'
import RichText from './RichText.jsx'
import ArcOrb from './ArcOrb.jsx'

const GREETING = `Hi! I'm ${profile.firstName}'s profile agent. I read his resume and LinkedIn profile at runtime, so ask me anything about his experience, projects, skills or education. I can answer with **photos, tables and charts** too.`
const SOURCES = { live: 'resume.pdf + LinkedIn · Claude', local: 'resume data · offline' }
const countTokens = (s) => s.split(/\s+/).filter(Boolean).length
const SETTLE_MS = 600 // keep the orb 'speaking' briefly after an answer so its pulse settles

export default function PromptConsole() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('live')
  const [tokens, setTokens] = useState(countTokens(GREETING))
  const logRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)
  const energy = useRef(0)
  const [focused, setFocused] = useState(false)
  const [settling, setSettling] = useState(false)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!settling) return
    const id = setTimeout(() => setSettling(false), SETTLE_MS)
    return () => clearTimeout(id)
  }, [settling])

  // busy + status: waiting on the agent; busy without status: answer text is streaming.
  const orbState = busy
    ? status ? 'thinking' : 'speaking'
    : settling ? 'speaking' : focused && input.trim() ? 'listening' : 'idle'

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, status])

  const ask = async (raw) => {
    const question = raw.trim()
    if (!question || busy) return
    const history = messages.slice(1).filter((m) => m.content)
    setInput('')
    setSettling(false)
    setBusy(true)
    setStatus('thinking')
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])

    let gotText = false
    const appendText = (chunk) => {
      gotText = true
      energy.current = Math.max(energy.current, Math.min(1, 0.4 + chunk.length / 80))
      setStatus('')
      setTokens((t) => t + countTokens(chunk))
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
        signal: abortRef.current.signal,
      })
    } catch (err) {
      if (err.name !== 'AbortError') appendText('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      setStatus('')
      if (gotText) setSettling(true)
      inputRef.current?.focus()
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="card chat" id="console">
      <div className="chat__bg" aria-hidden="true">
        <ArcOrb state={orbState} energyRef={energy} />
      </div>
      <h2>Prompt console</h2>
      <div className="log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation" aria-busy={busy}>
        {messages.map((m, i) => {
          const streaming = busy && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>
              <small>{m.role === 'user' ? 'you' : 'profile-agent'}</small>
              {m.role === 'user' ? <span className="msg__text">{m.content}</span> : <RichText text={m.content} />}
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
      <div className="metrics" aria-hidden="true">
        <span>tokens: {tokens}</span>
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Ask about ${profile.firstName.split(' ')[0]}'s experience, projects, skills…`}
          maxLength={500}
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !input.trim()}>
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      <div className="chips" role="group" aria-label="Suggested prompts">
        {suggestedPrompts.map((q) => (
          <button key={q} type="button" onClick={() => ask(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
