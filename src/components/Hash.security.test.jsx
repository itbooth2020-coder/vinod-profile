import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Projects from './Projects.jsx'
import App from '../App.jsx'

// Security review 2026-11-24: hash and query handling. Anyone can send a link with any #fragment, so a
// crafted link must not break the page. App.jsx wraps decodeURIComponent(location.hash) in try/catch;
// Projects.jsx's caseFromHash() now does too (SEC-004).
afterEach(() => history.replaceState(null, '', '/'))

describe('crafted #case-… links', () => {
  it.each(['#case-<img src=x onerror=alert(1)>', '#case-__proto__', '#case-constructor', '#case-' + 'a'.repeat(10_000), '#case-%3Cscript%3E'])(
    '%s opens nothing and renders no markup',
    (hash) => {
      history.replaceState(null, '', '/' + hash)
      const { container } = render(<Projects />)
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(container.querySelector('img[src="x"], script')).toBeNull()
    },
  )

  // FIXED (SEC-004, Medium; was a real bug): Projects.jsx caseFromHash() called decodeURIComponent(m[1]) without a
  // try/catch, so a link with a malformed escape (e.g. https://www.vinodyadav.com/#case-%E0%A4%A) throws
  // URIError in Projects' mount effect. Projects is not inside a SectionBoundary (App.jsx) and main.jsx
  // has no top-level error boundary, so React 19 unmounts the whole root: anyone can share a link that
  // shows a blank page (the prerendered HTML is replaced by nothing). No script runs. The hashchange
  // listener throws too (uncaught error on in-page navigation to such a hash).
  // Fix (Projects.jsx), and add a top-level boundary in main.jsx / App.jsx as defence in depth:
  //   const caseFromHash = () => {
  //     const m = window.location.hash.match(/^#case-(.+)$/)
  //     if (!m) return undefined
  //     let slug
  //     try { slug = decodeURIComponent(m[1]) } catch { return undefined }
  //     return cases.find((p) => slugOf(p) === slug)
  //   }
  it('a malformed percent-escape (#case-%E0%A4%A) does not take the page down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const swallow = (e) => e.preventDefault()
    window.addEventListener('error', swallow)
    try {
      history.replaceState(null, '', '/#case-%E0%A4%A')
      const { container } = render(<App />)
      await new Promise((r) => setTimeout(r, 50))
      expect(container.querySelector('#projects')).not.toBeNull()
      expect(container.querySelector('header.header')).not.toBeNull() // the site header (VINCE's panel has a <header> too)
    } finally {
      window.removeEventListener('error', swallow)
    }
  })

  it('SEC-004: Projects itself (not just its boundary) renders, and a hashchange to the bad escape throws nothing', () => {
    history.replaceState(null, '', '/#case-%E0%A4%A')
    render(<Projects />)
    expect(screen.getByRole('heading', { name: 'Key projects' })).toBeInTheDocument()
    expect(screen.queryByText("This section couldn't load.")).toBeNull()
    history.replaceState(null, '', '/#case-%ZZ')
    expect(() => window.dispatchEvent(new HashChangeEvent('hashchange'))).not.toThrow()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('the same malformed escape on a section hash (#%E0%A4%A) is handled (App.jsx try/catch)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    history.replaceState(null, '', '/#%E0%A4%A')
    const { container } = render(<App />)
    await new Promise((r) => setTimeout(r, 50))
    expect(container.querySelector('#projects')).not.toBeNull()
  })

  it('?brief= only switches on for exactly "1" and reflects nothing else into the page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    history.replaceState(null, '', '/?brief=%3Cscript%3Ealert(1)%3C/script%3E')
    const { container } = render(<App />)
    expect(document.documentElement.dataset.mode).toBeUndefined()
    expect(container.innerHTML).not.toMatch(/<script/i)
  })
})
