import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { importAgain } from './importAgain.js'

describe('importAgain', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the module when the first load works, without waiting', async () => {
    const load = vi.fn().mockResolvedValue({ default: 1 })
    await expect(importAgain(load)).resolves.toEqual({ default: 1 })
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('tries the same load again after a short wait when the error names no chunk URL', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ok: true })
    const p = importAgain(load)
    await vi.advanceTimersByTimeAsync(799)
    expect(load).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(p).resolves.toEqual({ ok: true })
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('rejects when the second try fails too', async () => {
    const load = vi.fn().mockRejectedValue(new Error('offline'))
    const p = importAgain(load)
    const check = expect(p).rejects.toThrow('offline')
    await vi.advanceTimersByTimeAsync(800)
    await check
    expect(load).toHaveBeenCalledTimes(2)
  })
  // The retry under a fresh URL (an error naming https://…/chunk.js) needs a real module server:
  // covered by the UAT (FUNC-014), not here.
})
