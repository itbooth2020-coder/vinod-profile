import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHROMIUM_TIP, STEPS, helpFor, helpOff, isChromium, platformOf, resetHelpOff, setHelpOff, watchMailto } from './mailtoCheck.js'

const UA = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  winFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  cros: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0',
}

describe('platformOf / helpFor', () => {
  it('reads the user agent', () => {
    expect(platformOf({ userAgent: UA.win })).toBe('windows')
    expect(platformOf({ userAgent: UA.mac })).toBe('mac')
    expect(platformOf({ userAgent: UA.mac, maxTouchPoints: 5 })).toBe('ios') // iPadOS
    expect(platformOf({ userAgent: UA.iphone })).toBe('ios')
    expect(platformOf({ userAgent: UA.android })).toBe('android')
    expect(platformOf({ userAgent: UA.cros })).toBe('chromeos')
    expect(platformOf({ userAgent: UA.linux })).toBe('linux')
    expect(platformOf({ userAgent: '' })).toBe('other')
  })

  it('prefers userAgentData.platform', () => {
    expect(platformOf({ userAgentData: { platform: 'macOS' }, userAgent: UA.win })).toBe('mac')
    expect(platformOf({ userAgentData: { platform: 'Android' }, userAgent: UA.win })).toBe('android')
    expect(platformOf({ userAgentData: { platform: 'Chrome OS' } })).toBe('chromeos')
    expect(platformOf({ userAgentData: { platform: '' }, userAgent: UA.win })).toBe('windows')
  })

  it('detects Chrome and Edge', () => {
    expect(isChromium({ userAgent: UA.win })).toBe(true)
    expect(isChromium({ userAgent: UA.winFirefox })).toBe(false)
    expect(isChromium({ userAgent: UA.mac })).toBe(false)
    expect(isChromium({ userAgentData: { brands: [{ brand: 'Microsoft Edge' }] } })).toBe(true)
  })

  it('gives the OS steps, plus the Chrome/Edge tip on desktops', () => {
    expect(helpFor({ userAgent: UA.win })).toEqual({ os: 'windows', steps: [STEPS.windows, CHROMIUM_TIP] })
    expect(helpFor({ userAgent: UA.winFirefox }).steps).toEqual([STEPS.windows])
    expect(helpFor({ userAgent: UA.mac }).steps).toEqual([STEPS.mac])
    expect(helpFor({ userAgent: UA.android }).steps).toEqual([STEPS.android])
    expect(helpFor({ userAgent: UA.linux }).steps).toEqual([STEPS.other])
    expect(STEPS.windows).toMatch(/Default apps.*MAILTO/)
    expect(STEPS.mac).toMatch(/Default email reader/)
    expect(STEPS.ios).toMatch(/Default Apps, then Email/)
  })
})

describe('helpOff', () => {
  it('saves "don\'t show again" and survives storage that throws', () => {
    expect(helpOff()).toBe(false)
    setHelpOff()
    expect(helpOff()).toBe(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(helpOff()).toBe(true) // still this visit
    // A later visit (a new page load) reads it from storage; cleared storage means off again.
    resetHelpOff()
    expect(helpOff()).toBe(false)
    expect(() => setHelpOff()).not.toThrow()
    // TEST-009: not saved, but it holds for the rest of the visit.
    expect(helpOff()).toBe(true)
  })

  it('a saved choice is read back on a later visit', () => {
    setHelpOff()
    expect(localStorage.getItem('mailto-help-off')).toBe('1')
    resetHelpOff()
    expect(helpOff()).toBe(true)
  })
})

describe('watchMailto', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  })
  afterEach(() => vi.useRealTimers())

  it('calls back when nothing takes the page focus within 1500 ms', () => {
    const cb = vi.fn()
    watchMailto(cb)
    vi.advanceTimersByTime(1499)
    expect(cb).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['blur', () => window.dispatchEvent(new Event('blur'))],
    ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
  ])('does nothing after %s', (_, fire) => {
    const cb = vi.fn()
    watchMailto(cb)
    vi.advanceTimersByTime(500)
    fire()
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('does nothing when the page is hidden', () => {
    const cb = vi.fn()
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    watchMailto(cb)
    document.dispatchEvent(new Event('visibilitychange'))
    vis.mockRestore()
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('skips when the page had no focus, the visitor turned it off, or the click was no user gesture', () => {
    const cb = vi.fn()
    document.hasFocus.mockReturnValue(false)
    watchMailto(cb)
    document.hasFocus.mockReturnValue(true)
    watchMailto(cb, { nav: { userActivation: { hasBeenActive: false } } })
    setHelpOff()
    watchMailto(cb)
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
  })

  // UX-020: something took over, so the chooser can close.
  it.each([
    ['blur', () => window.dispatchEvent(new Event('blur'))],
    ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
  ])('calls onHandled once after %s, and never the no-handler callback', (_, fire) => {
    const cb = vi.fn()
    const onHandled = vi.fn()
    watchMailto(cb, { onHandled })
    vi.advanceTimersByTime(300)
    fire()
    fire()
    vi.advanceTimersByTime(2000)
    expect(onHandled).toHaveBeenCalledTimes(1)
    expect(cb).not.toHaveBeenCalled()
  })

  it('calls onHandled when the page is hidden, and not when nothing happened', () => {
    const cb = vi.fn()
    const onHandled = vi.fn()
    watchMailto(cb, { onHandled })
    vi.advanceTimersByTime(2000)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(onHandled).not.toHaveBeenCalled()
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    watchMailto(cb, { onHandled })
    document.dispatchEvent(new Event('visibilitychange'))
    vis.mockRestore()
    vi.advanceTimersByTime(2000)
    expect(onHandled).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('with the notice turned off, still reports a handler but never shows the notice', () => {
    setHelpOff()
    const cb = vi.fn()
    const onHandled = vi.fn()
    watchMailto(cb, { onHandled })
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
    watchMailto(cb, { onHandled })
    window.dispatchEvent(new Event('blur'))
    expect(onHandled).toHaveBeenCalledTimes(1)
    expect(cb).not.toHaveBeenCalled()
  })

  it('a cancelled watch calls neither callback', () => {
    const cb = vi.fn()
    const onHandled = vi.fn()
    watchMailto(cb, { onHandled })()
    window.dispatchEvent(new Event('blur'))
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
    expect(onHandled).not.toHaveBeenCalled()
  })

  it('can be cancelled', () => {
    const cb = vi.fn()
    watchMailto(cb)()
    vi.advanceTimersByTime(2000)
    expect(cb).not.toHaveBeenCalled()
  })
})
