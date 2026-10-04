import { useEffect, useRef, useState } from 'react'
import { profile, suggestedPrompts } from '../data.js'
import { askAgent } from '../agent/askAgent.js'

const GREETING = `Hi! I'm ${profile.firstName}'s profile agent. I read his resume and LinkedIn profile at runtime, so ask me anything about his experience, projects, skills or education.`
const SOURCES = { live: 'resume.pdf + LinkedIn · Claude', local: 'resume data · offline' }
const countTokens = (s) => s.split(/\s+/).filter(Boolean).length

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

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages, status])

  const ask = async (raw) => {
    const question = raw.trim()
    if (!question || busy) return
    const history = messages.slice(1).filter((m) => m.content)
    setInput('')
    setBusy(true)
    setStatus('thinking')
    setMessages((m) => [...m, { role: 'user', content: question }, { role: 'assistant', content: '' }])

    const appendText = (chunk) => {
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
      inputRef.current?.focus()
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="card chat" id="console">
      <h2>Prompt console</h2>
      <div className="log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation" aria-busy={busy}>
        {messages.map((m, i) => {
          const streaming = busy && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>
              <small>{m.role === 'user' ? 'you' : 'profile-agent'}</small>
              <span className="msg__text">{m.content}</span>
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
