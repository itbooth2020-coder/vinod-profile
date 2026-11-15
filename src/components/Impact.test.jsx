import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FakeObserver } from '../test/setup.js'
import { highlights, stats } from '../data.js'
import Impact from './Impact.jsx'
import Counter from './Counter.jsx'
import Leadership from './Leadership.jsx'

// "At a glance" is a button beside the hero's Email that opens the stats and highlights in a dialog.
describe('Impact (At a glance)', () => {
  const openDialog = async (user) => {
    await user.click(screen.getByRole('button', { name: 'At a glance' }))
    return screen.getByRole('dialog', { name: 'At a glance' })
  }

  it('is a secondary button that opens the stats and highlights in a dialog', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    const btn = screen.getByRole('button', { name: 'At a glance' })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    expect(btn).toHaveClass('btn')
    expect(btn).not.toHaveClass('btn--primary')
    const dialog = await openDialog(user)
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('heading', { name: 'At a glance', level: 2 })).toBeInTheDocument()
    for (const s of stats) expect(within(dialog).getByText(s.label)).toBeInTheDocument()
    for (const h of highlights) expect(within(dialog).getByRole('heading', { name: h.title, level: 3 })).toBeInTheDocument()
  })

  it('gives screen readers every final value, whatever the animation shows', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    const dialog = await openDialog(user)
    for (const s of stats) {
      const sr = within(dialog).getByText(s.sr || s.value, { selector: '.sr-only' })
      expect(sr.closest('[aria-hidden="true"]')).toBeNull()
      expect(within(sr.closest('div')).getByText(s.label)).toBeInTheDocument()
    }
  })

  it('hides the animated copies from screen readers', () => {
    const { container } = render(<Impact />)
    const copies = container.querySelectorAll('.counter__live, .counter__final')
    expect(copies).toHaveLength(stats.length * 2)
    for (const el of copies) expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('Close returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    const dialog = await openDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(dialog).not.toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'At a glance' })).toHaveFocus()
  })

  it('Escape returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    const dialog = await openDialog(user)
    // jsdom has no native Escape handling; on Escape browsers fire 'cancel' and close the modal dialog,
    // which fires 'close', as here.
    act(() => {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
      dialog.close()
    })
    expect(dialog).not.toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'At a glance' })).toHaveFocus()
  })

  it('a click on the dialog backdrop closes it', async () => {
    const user = userEvent.setup()
    render(<Impact />)
    const dialog = await openDialog(user)
    await user.click(dialog) // the <dialog> itself, outside its content
    expect(dialog).not.toHaveAttribute('open')
  })

  it('opens from the old #impact anchor and from #glance, and clears the hash on close', () => {
    for (const hash of ['#impact', '#glance']) {
      history.replaceState(null, '', `/${hash}`)
      const { unmount } = render(<Impact />)
      const dialog = screen.getByRole('dialog', { name: 'At a glance' })
      expect(dialog).toHaveAttribute('open')
      act(() => dialog.close())
      expect(window.location.hash).toBe('')
      unmount()
    }
    const { container } = render(<Impact />)
    const dialog = container.querySelector('dialog')
    expect(dialog).not.toHaveAttribute('open')
    act(() => {
      history.replaceState(null, '', '/#impact') // e.g. "More in At a glance" in one of VINCE's answers
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(dialog).toHaveAttribute('open')
  })
})

describe('Counter', () => {
  const live = (c) => c.querySelector('.counter__live').textContent
  // Animation frames on the same clock as performance.now(), `lag` ms behind it (a browser's frame
  // timestamp is the frame's start, which can be earlier than a performance.now() read during it).
  const frames = (lag = 0) => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => setTimeout(() => cb(performance.now() - lag), 16))
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id))
  }
  // Every figure the animated copy shows, until stop().
  const watch = (container) => {
    const shown = []
    const mo = new MutationObserver(() => shown.push(live(container)))
    mo.observe(container, { subtree: true, characterData: true, childList: true })
    return { shown, stop: () => mo.disconnect() }
  }

  it('counts a leading number up to its value once in view', async () => {
    frames()
    const { container } = render(<Counter value="35+" />)
    expect(live(container)).toBe('0+')
    const io = FakeObserver.instances.find((o) => o.targets.length)
    act(() => io.trigger({ isIntersecting: true }))
    await waitFor(() => expect(live(container)).toBe('35+'), { timeout: 3000 })
  })

  it('never shows a negative figure, even when a frame timestamp precedes the start', async () => {
    frames(50)
    const { container } = render(<Counter value="35+" />)
    const { shown, stop } = watch(container)
    const io = FakeObserver.instances.find((o) => o.targets.length)
    act(() => io.trigger({ isIntersecting: true }))
    await waitFor(() => expect(live(container)).toBe('35+'), { timeout: 3000 })
    stop()
    expect(shown.filter((s) => s.startsWith('-'))).toEqual([])
  })

  it('shows the final value at once for reduced motion', () => {
    window.__media['(prefers-reduced-motion: reduce)'] = true
    const { container } = render(<Counter value="100%" />)
    expect(live(container)).toBe('100%')
  })

  it('never counts values with more digits after the number', () => {
    const { container } = render(<Counter value="3 wk → 5 days" sr="3 weeks to 5 days" />)
    expect(live(container)).toBe('3 wk → 5 days')
    expect(screen.getByText('3 weeks to 5 days')).toHaveClass('sr-only')
  })
})

describe('Leadership', () => {
  it('shows "How I lead" with four evidence cards and the philosophy quote', () => {
    const { container } = render(<Leadership />)
    const region = screen.getByRole('region', { name: 'How I lead' })
    expect(within(region).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Hiring & growth', 'Delivery', 'Quality', 'Budget & stakeholders'])
    expect(container.querySelector('blockquote')).not.toBeEmptyDOMElement()
    expect(region).toHaveTextContent('Drove hiring of 8 senior engineers')
  })
})
