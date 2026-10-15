// The offline agent (and the resume data it searches) loads on the first question, not with the page.
const loadLocal = () => import('./localAgent.js')

// VITE_LIVE_AGENT (build-time flag): whether the site has a server with /api/ask and /api/speak.
// Production builds call them only when it is 'true'. The static site (S3 + CloudFront) leaves it
// unset, so the console uses the local agent and VINCE the browser voice, with no /api requests.
// `npm run dev` mounts the endpoints (vite.config.js), so dev tries them unless it is 'false'.
const flag = import.meta.env.VITE_LIVE_AGENT
export const liveAgent = import.meta.env.DEV ? flag !== 'false' : flag === 'true'

// After one failed /api call (network error, non-2xx, or a server without credentials), skip
// /api for the rest of the visit. Shared with voice.js.
let apiDown = false
export const apiAvailable = () => liveAgent && !apiDown
export const markApiDown = () => {
  apiDown = true
}

// Whether answers come from the offline resume search: always on the static site, and in dev
// after the live endpoint has failed once. The console and VINCE label their answers with it.
export const offline = () => !apiAvailable()

// Streams an answer from the runtime agent at /api/ask (NDJSON), falling back to the
// in-browser resume agent when the endpoint is missing or has no API credentials.
// Callbacks: onStatus(text), onText(chunk), onSource('live' | 'local'), and for live answers
// onReset() (discard the text so far: another model is taking over) and onDone({ sig, sources }).
// Keep sig on the answer in history: the server only trusts earlier answers it signed (AI-005).
// voice: true asks for a short, speakable answer (used by the VINCE voice assistant). history
// (earlier turns) also lets the offline agent follow up on "tell me more" or "what did he do there?".
export async function askAgent(question, history, { onStatus, onText, onSource, onReset, onDone, signal, voice = false }) {
  const local = async () => {
    const { answerLocally } = await loadLocal()
    onSource('local')
    onText(answerLocally(question, history))
  }

  if (!apiAvailable()) return local()

  let res
  try {
    res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        history: history.map(({ role, content, sig }) => ({ role, content, sig })),
        mode: voice ? 'voice' : undefined,
      }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    markApiDown()
    return local()
  }

  const type = res.headers.get('content-type') || ''
  if (res.status === 429) {
    onSource('live')
    return onText((await res.json().catch(() => ({}))).error || 'Too many questions, please try again shortly.')
  }
  // 429 (above) is a live rate limit, so it doesn't count as the endpoint being down.
  if (!res.ok || !type.includes('ndjson') || !res.body) {
    markApiDown()
    return local()
  }

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
      } else if (evt.type === 'reset') {
        wroteText = false
        onReset?.()
      } else if (evt.type === 'done') {
        onDone?.({ sig: evt.sig, sources: evt.sources })
      } else if (evt.type === 'error') {
        // interrupted: part of the answer is shown, so it ends with the notice; no offline answer is appended.
        if (evt.fallback) markApiDown()
        if (evt.fallback && !wroteText) return local()
        onText((wroteText ? '\n\n' : '') + evt.text)
      }
    }
  }
}
