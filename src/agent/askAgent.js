import { answerLocally } from './localAgent.js'

// Streams an answer from the runtime agent at /api/ask (NDJSON), falling back to the
// in-browser resume agent when the endpoint is missing or has no API credentials.
// Callbacks: onStatus(text), onText(chunk), onSource('live' | 'local'). voice: true asks for a short,
// speakable answer (used by the VINCE voice assistant).
export async function askAgent(question, history, { onStatus, onText, onSource, signal, voice = false }) {
  const local = () => {
    onSource('local')
    onText(answerLocally(question))
  }

  let res
  try {
    res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history, mode: voice ? 'voice' : undefined }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    return local()
  }

  const type = res.headers.get('content-type') || ''
  if (res.status === 429) {
    onSource('live')
    return onText((await res.json().catch(() => ({}))).error || 'Too many questions, please try again shortly.')
  }
  if (!res.ok || !type.includes('ndjson') || !res.body) return local()

  onSource('live')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let wroteText = false

  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      const evt = JSON.parse(line)
      if (evt.type === 'status') onStatus(evt.text)
      else if (evt.type === 'text') {
        wroteText = true
        onText(evt.text)
      } else if (evt.type === 'error') {
        if (evt.fallback && !wroteText) return local()
        onText((wroteText ? '\n\n' : '') + evt.text)
      }
    }
  }
}
