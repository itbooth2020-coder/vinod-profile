import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// askAgent keeps module state (the /api-down flag and the load-failure counter), so each test loads
// a fresh copy. importAgain is mocked so a test can make the offline agent's chunk fail to load.
const loader = { fail: 0 }
vi.mock('../importAgain.js', () => ({
  importAgain: (load) => (loader.fail-- > 0 ? Promise.reject(new Error('chunk failed')) : load()),
}))

const callbacks = () => {
  const out = { text: '', sources: [] }
  return {
    out,
    cb: {
      onStatus: vi.fn(),
      onText: (t) => (out.text += t),
      onSource: (s) => out.sources.push(s),
      onReset: () => (out.text = ''),
      onDone: vi.fn(),
    },
  }
}

const load = async (live) => {
  vi.resetModules()
  vi.stubEnv('VITE_LIVE_AGENT', live ? 'true' : 'false')
  return import('./askAgent.js')
}

const ndjson = (...events) =>
  new Response(events.map((e) => JSON.stringify(e)).join('\n') + '\n', { status: 200, headers: { 'content-type': 'application/x-ndjson' } })

beforeEach(() => {
  loader.fail = 0
})
afterEach(() => vi.stubEnv('VITE_LIVE_AGENT', 'false'))

describe('askAgent offline (the static site)', () => {
  it('answers from the local agent and never calls /api', async () => {
    const { askAgent, offline, apiAvailable } = await load(false)
    expect(offline()).toBe(true)
    expect(apiAvailable()).toBe(false)
    const { out, cb } = callbacks()
    await askAgent('Can I get his resume?', [], cb)
    expect(out.sources).toEqual(['local'])
    expect(out.text).toMatch(/available on request/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes history so follow-ups work', async () => {
    const { askAgent } = await load(false)
    const { out, cb } = callbacks()
    await askAgent('What did he do before that?', [{ role: 'user', content: 'What did he do at HTC?' }, { role: 'assistant', content: 'HTC…' }], cb)
    expect(out.text).toMatch(/Before HTC Global Services/)
  })

  it('throws on the first failed load, so the caller can say "try again"', async () => {
    const { askAgent } = await load(false)
    loader.fail = 1
    await expect(askAgent('Who is Vinod?', [], callbacks().cb)).rejects.toThrow('chunk failed')
  })

  it('after two failed loads in a row, says to reload the page (FUNC-015)', async () => {
    const { askAgent } = await load(false)
    loader.fail = 2
    await expect(askAgent('Who is Vinod?', [], callbacks().cb)).rejects.toThrow()
    const { out, cb } = callbacks()
    await askAgent('Who is Vinod?', [], cb)
    expect(out.text).toBe("The assistant couldn't load. Please reload the page to try again.")
    expect(out.sources).toEqual(['local'])
  })

  it('resets the failure counter after a successful load', async () => {
    const { askAgent } = await load(false)
    loader.fail = 1
    await expect(askAgent('Who is Vinod?', [], callbacks().cb)).rejects.toThrow()
    await askAgent('Who is Vinod?', [], callbacks().cb) // loads
    loader.fail = 1
    await expect(askAgent('Who is Vinod?', [], callbacks().cb)).rejects.toThrow('chunk failed')
  })
})

describe('askAgent with a live endpoint (dev / Phase 2)', () => {
  it('falls back to the local agent after a network error, and skips /api for the rest of the visit', async () => {
    const mod = await load(true)
    expect(mod.apiAvailable()).toBe(true)
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { out, cb } = callbacks()
    await mod.askAgent('Can I get his resume?', [], cb)
    expect(out.sources).toEqual(['local'])
    expect(out.text).toMatch(/available on request/)
    expect(mod.offline()).toBe(true)
    await mod.askAgent('Who is Vinod?', [], callbacks().cb)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('falls back when the endpoint answers without NDJSON (no credentials)', async () => {
    const mod = await load(true)
    fetch.mockResolvedValueOnce(new Response('{"error":"no key"}', { status: 503, headers: { 'content-type': 'application/json' } }))
    const { out, cb } = callbacks()
    await mod.askAgent('Who is Vinod?', [], cb)
    expect(out.sources).toEqual(['local'])
    expect(mod.offline()).toBe(true)
  })

  it('treats 429 as a live rate limit, not the endpoint being down', async () => {
    const mod = await load(true)
    fetch.mockResolvedValueOnce(new Response('{"error":"Slow down"}', { status: 429, headers: { 'content-type': 'application/json' } }))
    const { out, cb } = callbacks()
    await mod.askAgent('Who is Vinod?', [], cb)
    expect(out).toEqual({ text: 'Slow down', sources: ['live'] })
    expect(mod.apiAvailable()).toBe(true)
  })

  it('streams text, and keeps only well-formed citations (max 5)', async () => {
    const mod = await load(true)
    const cites = [...Array(7)].map((_, i) => ({ label: `resume p. ${i}`, text: 't' }))
    fetch.mockResolvedValueOnce(ndjson({ type: 'status', text: 'Thinking' }, { type: 'text', text: 'Hel' }, { type: 'text', text: 'lo' }, { type: 'done', sig: 'S', citations: [{ label: 1 }, ...cites] }))
    const { out, cb } = callbacks()
    await mod.askAgent('Hi', [{ role: 'user', content: 'x', sig: 'a', extra: 'dropped' }], cb)
    expect(out.text).toBe('Hello')
    expect(cb.onStatus).toHaveBeenCalledWith('Thinking')
    expect(cb.onDone).toHaveBeenCalledWith({ sig: 'S', sources: undefined, citations: cites.slice(0, 5) })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.history).toEqual([{ role: 'user', content: 'x', sig: 'a' }])
  })

  it('a fallback error before any text hands over to the local agent', async () => {
    const mod = await load(true)
    fetch.mockResolvedValueOnce(ndjson({ type: 'error', fallback: true, text: 'Overloaded' }))
    const { out, cb } = callbacks()
    await mod.askAgent('Can I get his resume?', [], cb)
    expect(out.sources).toEqual(['live', 'local'])
    expect(out.text).toMatch(/available on request/)
    expect(mod.offline()).toBe(true)
  })

  it('an error after some text ends the answer with the notice', async () => {
    const mod = await load(true)
    fetch.mockResolvedValueOnce(ndjson({ type: 'text', text: 'Part' }, { type: 'error', text: 'Interrupted.' }))
    const { out, cb } = callbacks()
    await mod.askAgent('Hi', [], cb)
    expect(out.text).toBe('Part\n\nInterrupted.')
  })

  it('rethrows an abort instead of falling back', async () => {
    const mod = await load(true)
    fetch.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(mod.askAgent('Hi', [], callbacks().cb)).rejects.toThrow('aborted')
    expect(mod.apiAvailable()).toBe(true)
  })
})
