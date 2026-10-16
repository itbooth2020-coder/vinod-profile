import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { profile, suggestedPrompts } from '../data.js'
import { askAgent, liveAgent } from '../agent/askAgent.js'
import { append, getTurns, history, pendingElsewhere, subscribe, update } from '../agent/conversation.js'
import RichText from './RichText.jsx'
import { Sources } from './LazyParts.jsx'

// VINCE's text interface (CHAT-001): the same assistant and the same conversation as the VINCE panel
// (agent/conversation.js), shown as a console. Questions asked here appear in the panel too and the
// other way round, but VINCE only speaks answers to questions asked in his panel.
const FIRST = profile.firstName.split(' ')[0]
// Sets expectations for the offline resume search (AI-003): it searches, and points to Vinod when it can't find something.
const GREETING = `I'm VINCE, ${FIRST}'s assistant. I search his profile${liveAgent ? ' (with live AI answers when available)' : ''}; for anything I can't find, contact ${FIRST}. Type a question about his experience, projects, skills or education; answers can include **photos, tables and charts**. This is the same conversation as the VINCE panel, so you can carry on there by voice.`
const SOURCES = { live: 'Claude · resume + LinkedIn', local: 'resume search · offline' }

export default function PromptConsole() {
  const turns = useSyncExternalStore(subscribe, getTurns)
  const messages = turns.filter((t) => t.role === 'user' || t.role === 'assistant')
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
  }, [turns, status])

  // fromInput: the question was typed, so focus goes back to the field afterwards. A suggestion
  // chip keeps focus, so keyboard users can try the next chip and phones don't open the keyboard.
  const ask = async (raw, { fromInput = false } = {}) => {
    const question = raw.trim()
    if (!question || busy) return
    const earlier = history()
    setInput('')
    setBusy(true)
    setStatus('thinking')
    append({ role: 'user', content: question, via: 'console' })
    const id = append({ role: 'assistant', content: '', via: 'console', pending: true })

    const appendText = (chunk) => {
      setStatus('')
      update(id, (t) => ({ content: t.content + chunk }))
    }

    abortRef.current = new AbortController()
    try {
      await askAgent(question, earlier, {
        onStatus: setStatus,
        onText: appendText,
        onSource: setSource,
        // A fallback model took over mid-answer: start again rather than splice two answers.
        onReset: () => update(id, { content: '' }),
        // sig lets the live agent trust this answer as history; sources and citations are shown under it.
        onDone: ({ sig, sources, citations }) => update(id, { sig, sources, citations }),
        signal: abortRef.current.signal,
      })
    } catch (err) {
      if (err.name !== 'AbortError') appendText('Something went wrong. Please try again.')
      else if (stoppedRef.current) appendText('\n\nStopped.')
    } finally {
      update(id, { pending: false })
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
      <h3>Ask VINCE (text)</h3>
      {/* Answers to questions asked in the VINCE panel also appear here; they aren't announced twice. */}
      <div className="log" ref={logRef} role="log" aria-live={pendingElsewhere(turns, 'console') ? 'off' : 'polite'} aria-label="Conversation with VINCE" aria-busy={busy}>
        <div className="msg a">
          <small>VINCE</small>
          <RichText text={GREETING} />
        </div>
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === 'user' ? 'u' : 'a'}`}>
            <small>{m.role === 'user' ? 'you' : 'VINCE'}</small>
            {m.role === 'user' ? <span className="msg__text">{m.content}</span> : <RichText text={m.content} />}
            {m.sources?.length > 0 && <p className="msg__src">Source: {m.sources.join(' and ')}</p>}
            <Sources items={m.citations} />
            {m.pending && (
              <>
                {busy && m.via === 'console' && status && <span className="msg__status"> {status}…</span>}
                <span className="caret" aria-hidden="true" />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="metrics">
        <span>source: {SOURCES[source]}</span>
      </div>
      <form className="prompt" onSubmit={onSubmit}>
        <label htmlFor="prompt-input" className="sr-only">Ask VINCE a question about {profile.firstName}'s profile</label>
        <span className="prompt__sigil" aria-hidden="true">&gt;</span>
        <input
          id="prompt-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${FIRST}'s experience, projects, skills…`}
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
