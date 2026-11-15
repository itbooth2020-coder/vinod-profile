import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FakeObserver } from '../test/setup.js'
import { namesClient } from '../test/clientName.js'
import { highlights, stats } from '../data.js'
import Impact from './Impact.jsx'

// "At a glance" dialog (Impact.jsx): behaviours not covered by Impact.test.jsx. Added 15 Nov 2026 (t15).
const glanceButton = () => screen.getByRole('button', { name: 'At a glance' })
// By selector: a closed <dialog> is hidden, so its accessible name can't be computed by role queries.
const glanceDialog = () => document.querySelector('dialog.gdialog--glance')

describe('At a glance dialog (extra)', () => {
  it('is closed on load and in the prerendered HTML, with its content already rendered', () => {
    const html = renderToString(<Impact />)
    expect(html).toMatch(/<dialog[^>]*aria-labelledby="impact-h"/)
    expect(html).not.toMatch(/<dialog[^>]*\bopen\b/)
    for (const s of stats) expect(html).toContain(s.label)
    for (const h of highlights) expect(html).toContain(h.title)

    render(<Impact />)
    expect(glanceDialog()).not.toHaveAttribute('open')
  })

  it('shows the new Application Security highlight, naming the client only as a global bank', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    await user.click(glanceButton())
    const dialog = glanceDialog()
    const card = within(dialog).getByRole('heading', { name: 'Application Security', level: 3 }).closest('article')
    expect(card).toHaveTextContent(/~3,000 Android, iOS, and web applications for a global bank/)
    expect(namesClient(dialog.textContent)).toBe(false)
  })

  it('a click inside the content does not close it; only the backdrop (the <dialog> itself) does', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    await user.click(glanceButton())
    const dialog = glanceDialog()
    await user.click(within(dialog).getByRole('heading', { name: 'At a glance', level: 2 }))
    await user.click(within(dialog).getByText(stats[0].label))
    expect(dialog).toHaveAttribute('open')
    await user.click(dialog)
    expect(dialog).not.toHaveAttribute('open')
    expect(glanceButton()).toHaveFocus()
  })

  it('a second press while open is harmless', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    await user.click(glanceButton())
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    act(() => glanceButton().click())
    expect(showModal).not.toHaveBeenCalled()
    expect(glanceDialog()).toHaveAttribute('open')
  })

  it('returns focus to the button after closing a dialog that a deep link opened', () => {
    history.replaceState(null, '', '/#glance')
    render(<Impact />)
    const dialog = glanceDialog()
    expect(dialog).toHaveAttribute('open')
    act(() => within(dialog).getByRole('button', { name: 'Close dialog' }).click())
    expect(dialog).not.toHaveAttribute('open')
    expect(glanceButton()).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('keeps the query string when it clears the hash on close', () => {
    history.replaceState(null, '', '/?utm_source=x#impact')
    render(<Impact />)
    act(() => glanceDialog().close())
    expect(window.location.search).toBe('?utm_source=x')
    expect(window.location.hash).toBe('')
  })

  it('ignores other hashes', () => {
    render(<Impact />)
    for (const hash of ['#lead', '#impact-h', '#glance-x', '#case-bank-appsec']) {
      act(() => {
        history.replaceState(null, '', `/${hash}`)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      expect(glanceDialog(), hash).not.toHaveAttribute('open')
    }
  })

  it('does not clear a hash that is not its own when it closes', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    await user.click(glanceButton())
    history.replaceState(null, '', '/#lead')
    await user.click(within(glanceDialog()).getByRole('button', { name: 'Close dialog' }))
    expect(window.location.hash).toBe('#lead')
  })

  it('a deep link in brief mode leaves the brief first (brief:exit), then opens once the page is back', async () => {
    document.documentElement.dataset.mode = 'brief'
    history.replaceState(null, '', '/#glance')
    const exits = vi.fn()
    window.addEventListener('brief:exit', exits)
    try {
      const { rerender } = render(<Impact brief />)
      await waitFor(() => expect(exits).toHaveBeenCalledTimes(1))
      expect(glanceDialog()).not.toHaveAttribute('open')
      document.documentElement.removeAttribute('data-mode')
      rerender(<Impact brief={false} />)
      await waitFor(() => expect(glanceDialog()).toHaveAttribute('open'))
    } finally {
      window.removeEventListener('brief:exit', exits)
    }
  })

  it('leaving brief mode without a pending deep link does not open it', async () => {
    const { rerender } = render(<Impact brief />)
    rerender(<Impact brief={false} />)
    await new Promise((r) => setTimeout(r, 20))
    expect(glanceDialog()).not.toHaveAttribute('open')
  })

  describe('15 Nov fixes', () => {
    const openByHash = (hash = '#impact') =>
      act(() => {
        history.replaceState(null, '', `/${hash}`)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })

    it('FUNC-019: returns focus to the link that opened it (e.g. in VINCE), without scrolling the page', async () => {
      const user = userEvent.setup()
      render(
        <>
          <a href="#impact">More in At a glance</a>
          <Impact />
        </>,
      )
      const link = screen.getByRole('link', { name: 'More in At a glance' })
      link.focus()
      openByHash()
      expect(glanceDialog()).toHaveAttribute('open')
      const focus = vi.spyOn(HTMLElement.prototype, 'focus')
      await user.click(within(glanceDialog()).getByRole('button', { name: 'Close dialog' }))
      expect(link).toHaveFocus()
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
      expect(window.location.hash).toBe('')
    })

    it('FUNC-019: falls back to the button when the opener has gone (VINCE closed)', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <>
          <a href="#impact">More in At a glance</a>
          <Impact />
        </>,
      )
      screen.getByRole('link', { name: 'More in At a glance' }).focus()
      openByHash()
      rerender(<><Impact /></>)
      await user.click(within(glanceDialog()).getByRole('button', { name: 'Close dialog' }))
      expect(glanceButton()).toHaveFocus()
    })

    it('FUNC-019 / UI-013 / FUNC-020: the dialog keeps the UA position, Close is sticky on phones, and only a modal locks the page', async () => {
      const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
      const base = css.match(/^\.gdialog--glance \{[^}]*\}/m)[0]
      expect(base).not.toMatch(/position/)
      expect(css).toMatch(/:root:has\(\.gdialog--glance:modal\) \{ overflow: hidden;/)
      expect(css).not.toMatch(/:root:has\(\.gdialog--glance\[open\]\)/)
      const phone = css.slice(css.indexOf('@media (max-width: 600px) {\n  .gdialog--glance'))
      expect(phone).toMatch(/\.gdialog--glance \.pdialog__close \{ position: sticky; top: 8px;/)
      expect(phone).toMatch(/\.glance-dialog \.stats \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
    })

    it('FUNC-020: for printing it is reopened non-modally, then made modal again, without closing for good', () => {
      history.replaceState(null, '', '/#glance')
      render(<Impact />)
      const dialog = glanceDialog()
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
      act(() => window.dispatchEvent(new Event('beforeprint')))
      expect(dialog).toHaveAttribute('open')
      expect(showModal).not.toHaveBeenCalled()
      expect(window.location.hash).toBe('#glance')
      act(() => window.dispatchEvent(new Event('afterprint')))
      expect(showModal).toHaveBeenCalledTimes(1)
      expect(dialog).toHaveAttribute('open')
      expect(window.location.hash).toBe('#glance')
      act(() => within(dialog).getByRole('button', { name: 'Close dialog' }).click())
      expect(dialog).not.toHaveAttribute('open')
      expect(window.location.hash).toBe('')
      expect(glanceButton()).toHaveFocus()
    })

    it('FUNC-020: printing with it closed changes nothing', () => {
      render(<Impact />)
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
      act(() => {
        window.dispatchEvent(new Event('beforeprint'))
        window.dispatchEvent(new Event('afterprint'))
      })
      expect(glanceDialog()).not.toHaveAttribute('open')
      expect(showModal).not.toHaveBeenCalled()
    })

    it('FUNC-018: without JS and when the bundle fails, the button is hidden and the content shown', () => {
      const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
      const noscript = html.slice(html.indexOf('<noscript>'), html.indexOf('</noscript>'))
      expect(noscript).toMatch(/#glance, \.gdialog--glance \.pdialog__close \{ display: none !important; \}/)
      expect(noscript).toMatch(/\.gdialog--glance \{ display: block !important; position: static;/)
      expect(html).toMatch(/:root\[data-app='failed'\] :is\(#glance, \.gdialog--glance \.pdialog__close\) \{ display: none !important; \}/)
      expect(html).toMatch(/:root\[data-app='failed'\] \.gdialog--glance \{ display: block !important; position: static;/)
    })
  })

  describe('counters in the dialog', () => {
    const live = (dialog) => [...dialog.querySelectorAll('.counter__live')].map((el) => el.textContent)

    it('count up to every final value once in view, and screen readers get the final values throughout', async () => {
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16))
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id))
      const user = userEvent.setup()
      render(<Impact />)
      const dialog = glanceDialog()
      // Not counted before they are seen: the leading numbers start at 0; "3 wk → 5 days" is never counted.
      expect(live(dialog)).toEqual(['0+', '0%', '3 wk → 5 days', '0'])
      await user.click(glanceButton())
      for (const s of stats) expect(within(dialog).getByText(s.sr || s.value, { selector: '.sr-only' })).toBeInTheDocument()
      act(() => {
        for (const io of FakeObserver.instances.filter((o) => o.targets.length)) io.trigger({ isIntersecting: true })
      })
      await waitFor(() => expect(live(dialog)).toEqual(stats.map((s) => s.value)), { timeout: 3000 })
    })

    it('show the final values at once for reduced motion', async () => {
      window.__media['(prefers-reduced-motion: reduce)'] = true
      const user = userEvent.setup()
      render(<Impact />)
      await user.click(glanceButton())
      expect(live(glanceDialog())).toEqual(stats.map((s) => s.value))
    })
  })
})
