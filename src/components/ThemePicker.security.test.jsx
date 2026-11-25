import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ThemePicker, { isAccent } from './ThemePicker.jsx'

// Security review 2026-11-24 (SEC-011): tampered localStorage. 'site-theme' is read back with JSON.parse
// and its accent colours go straight into style.setProperty('--accent', …) here and in index.html's inline
// script. Writing localStorage needs script on this origin (XSS) or the visitor's own device, so this is
// defence in depth: a value that isn't a colour should be ignored, not applied.
const root = document.documentElement
afterEach(() => {
  root.removeAttribute('style')
  delete root.dataset.palette
  delete root.dataset.font
  document.querySelectorAll('link[id^="font-"]').forEach((l) => l.remove())
})
const withSaved = (theme) => {
  localStorage.setItem('site-theme', typeof theme === 'string' ? theme : JSON.stringify(theme))
  return render(<ThemePicker />)
}

describe('ThemePicker with a tampered site-theme', () => {
  it('survives invalid JSON (falls back to the defaults)', () => {
    withSaved('{not json')
    expect(root.dataset.palette).toBe('console')
  })

  it('only ever loads fonts from its own list (an unknown id adds no stylesheet)', () => {
    withSaved({ font: 'x" onload="alert(1)', palette: 'console' })
    expect(document.querySelectorAll('link[id^="font-"]')).toHaveLength(0)
  })

  it('a font id from the list loads only fonts.googleapis.com (allowed by the CSP)', () => {
    withSaved({ font: 'plex' })
    const links = [...document.querySelectorAll('link[id^="font-"]')]
    expect(links).toHaveLength(1)
    expect(links[0].href).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/)
  })

  it('palette and font values only become data-* attributes (text, not markup)', () => {
    withSaved({ palette: '"><img src=x onerror=alert(1)>', font: 'inter' })
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })

  // FIXED (SEC-011, Low; was a hardening gap): a non-colour accent was applied as-is. A custom property accepts any
  // token, so '--accent: url(https://evil.example/beacon)' is stored, and any rule using var(--accent)
  // as an image would request it. The meta CSP (img-src 'self' data:) blocks the request today, so the
  // impact is limited to a broken look; it can't add other declarations. Fix in ThemePicker.jsx load()
  // and in index.html's inline script: accept only /^#[0-9a-f]{6}$/i (what <input type="color"> gives).
  it('ignores an accent that is not a #rrggbb colour', () => {
    withSaved({ accent: 'url(https://evil.example/beacon)', accent2: 'red;background:url(https://evil.example/2)' })
    expect(root.style.getPropertyValue('--accent')).toBe('')
    expect(root.style.getPropertyValue('--accent2')).toBe('')
  })

  it('a tampered accent cannot add other declarations to <html style>', () => {
    withSaved({ accent: 'red; background-image: url(https://evil.example/x)' })
    expect(root.style.getPropertyValue('background-image')).toBe('')
  })

  it('SEC-011: applies a #rrggbb or plain hsl() accent, with a readable ink', () => {
    withSaved({ accent: '#2563eb', accent2: 'hsl(200, 80%, 60%)' })
    expect(root.style.getPropertyValue('--accent')).toBe('#2563eb')
    expect(root.style.getPropertyValue('--accent2')).toBe('hsl(200, 80%, 60%)')
    expect(root.style.getPropertyValue('--accent-ink')).toMatch(/^#(000000|ffffff)$/)
  })

  it.each(['#fff', 'red', 'var(--x)', '#2563eb;x', 'hsl(1,2%,3%) url(x)', 'hsla(0,0%,0%,0)', 42, null])('SEC-011: isAccent rejects %j', (v) => {
    expect(isAccent(v)).toBe(false)
  })

  it("SEC-011: index.html's inline script applies the same check", () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toMatch(/if \(c\(s\.accent\)\) r\.style\.setProperty\('--accent', s\.accent\)/)
    expect(html).toMatch(/if \(c\(s\.accent2\)\) r\.style\.setProperty\('--accent2', s\.accent2\)/)
    expect(html).not.toMatch(/if \(s\.accent2?\) r\.style\.setProperty/)
  })
})
