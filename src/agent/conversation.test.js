import { beforeEach, describe, expect, it, vi } from 'vitest'

let c
beforeEach(async () => {
  vi.resetModules() // the conversation is module state
  c = await import('./conversation.js')
})

describe('conversation store', () => {
  it('starts empty', () => {
    expect(c.getTurns()).toEqual([])
    expect(c.history()).toEqual([])
  })

  it('appends turns with increasing ids and notifies subscribers', () => {
    const fn = vi.fn()
    const off = c.subscribe(fn)
    const a = c.append({ role: 'user', content: 'Hi' })
    const b = c.append({ role: 'assistant', content: 'Hello' })
    expect(b).toBeGreaterThan(a)
    expect(fn).toHaveBeenCalledTimes(2)
    off()
    c.append({ role: 'note', speaker: 'vince', content: 'x' })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns a new array on every change (useSyncExternalStore)', () => {
    const before = c.getTurns()
    c.append({ role: 'user', content: 'Q' })
    expect(c.getTurns()).not.toBe(before)
    expect(before).toEqual([])
  })

  it('updates a turn with an object or a function', () => {
    const id = c.append({ role: 'assistant', content: 'a', pending: true })
    c.update(id, { content: 'ab' })
    c.update(id, (t) => ({ content: `${t.content}c`, pending: false }))
    expect(c.getTurns()[0]).toMatchObject({ id, content: 'abc', pending: false, role: 'assistant' })
  })

  it('builds history from finished questions and answers only, keeping sig', () => {
    c.append({ role: 'note', speaker: 'vince', content: 'Intro' })
    c.append({ role: 'user', content: 'Q1' })
    c.append({ role: 'assistant', content: 'A1', sig: 's1', citations: [{ label: 'x', text: 'y' }] })
    c.append({ role: 'user', content: 'Q2' })
    c.append({ role: 'assistant', content: '', pending: true })
    expect(c.history()).toEqual([
      { role: 'user', content: 'Q1', sig: undefined },
      { role: 'assistant', content: 'A1', sig: 's1' },
      { role: 'user', content: 'Q2', sig: undefined },
    ])
  })

  it('limits history to the most recent turns', () => {
    for (let i = 0; i < 15; i++) c.append({ role: 'user', content: `Q${i}` })
    const h = c.history()
    expect(h).toHaveLength(10)
    expect(h[0].content).toBe('Q5')
    expect(c.history(3).map((t) => t.content)).toEqual(['Q12', 'Q13', 'Q14'])
  })
})
