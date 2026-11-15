import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Header from './Header.jsx'

const SECTIONS = [
  ['leadership', '#lead'],
  ['projects', '#projects'],
  ['experience', '#experience'],
  ['role fit', '#fit'],
  ['skills', '#skills'],
  ['writing', '#blogs'],
  ['contact', '#contact'],
]

// Page sections with a fake layout: [id, top, bottom] in viewport pixels.
function layout(rects) {
  const els = rects.map(([id, top, bottom]) => {
    const el = document.createElement('section')
    el.id = id
    el.getClientRects = () => [{}]
    el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top })
    document.body.appendChild(el)
    return el
  })
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 10000 })
  return () => {
    els.forEach((el) => el.remove())
    delete document.documentElement.scrollHeight
  }
}

describe('Header', () => {
  let undo = () => {}
  afterEach(() => undo())

  it('lists the sections in page order as nav links', () => {
    render(<Header />)
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual(SECTIONS)
  })

  it('marks no section current at the top of an empty page', () => {
    render(<Header />)
    for (const link of screen.getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')
  })

  it('marks the section in view with aria-current as the page scrolls', async () => {
    undo = layout([
      ['lead', -900, -100],
      ['projects', 100, 700],
      ['experience', 700, 1400],
    ])
    render(<Header />)
    await waitFor(() => expect(screen.getByRole('link', { name: 'projects' })).toHaveAttribute('aria-current', 'true'))
    expect(screen.getByRole('link', { name: 'leadership' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'experience' })).not.toHaveAttribute('aria-current')

    // Scroll on: Experience crosses the line a third of the way down.
    document.getElementById('projects').getBoundingClientRect = () => ({ top: -600, bottom: 0 })
    document.getElementById('experience').getBoundingClientRect = () => ({ top: 0, bottom: 700 })
    act(() => {
      window.scrollY = 700
      fireEvent.scroll(window)
    })
    await waitFor(() => expect(screen.getByRole('link', { name: 'experience' })).toHaveAttribute('aria-current', 'true'))
    expect(screen.getByRole('link', { name: 'projects' })).not.toHaveAttribute('aria-current')
    window.scrollY = 0
  })

  // UX-017: over a block that isn't in the nav (Impact, the domain graph, Credentials), no pill is current.
  it('clears the current pill over a top-level block that is not in the nav', async () => {
    const main = document.createElement('main')
    main.id = 'main'
    const block = (id, top, bottom) => {
      const el = document.createElement('section')
      if (id) el.id = id
      el.getClientRects = () => [{}]
      el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 0, width: 0, height: bottom - top })
      main.appendChild(el)
      return el
    }
    const lead = block('lead', -900, -100)
    const impact = block('impact', -100, 300)
    const graph = block('', 300, 900)
    document.body.appendChild(main)
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 10000 })
    undo = () => {
      main.remove()
      delete document.documentElement.scrollHeight
    }
    render(<Header />)
    await waitFor(() => expect(screen.getByRole('link', { name: 'leadership' })).toBeInTheDocument())
    for (const link of screen.getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')

    // Leadership crosses the line: its pill is current.
    lead.getBoundingClientRect = () => ({ top: 0, bottom: 800, height: 800 })
    impact.getBoundingClientRect = () => ({ top: 800, bottom: 1200, height: 400 })
    graph.getBoundingClientRect = () => ({ top: 1200, bottom: 1800, height: 600 })
    act(() => fireEvent.scroll(window))
    await waitFor(() => expect(screen.getByRole('link', { name: 'leadership' })).toHaveAttribute('aria-current', 'true'))

    // The end of Leadership is still on screen, but an unnamed block (the domain graph's) has crossed
    // the line: cleared, not left on "leadership".
    lead.getBoundingClientRect = () => ({ top: -700, bottom: 100, height: 800 })
    impact.getBoundingClientRect = () => ({ top: 100, bottom: 120, height: 20 })
    graph.getBoundingClientRect = () => ({ top: 120, bottom: 720, height: 600 })
    act(() => fireEvent.scroll(window))
    await waitFor(() => expect(screen.getByRole('link', { name: 'leadership' })).not.toHaveAttribute('aria-current'))
    for (const link of screen.getAllByRole('link')) expect(link).not.toHaveAttribute('aria-current')
  })

  // UX-015: a focused pill scrolls into view within the row, without moving the page.
  it('scrolls a focused pill into view with "nearest"', () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<Header />)
    const pill = screen.getByRole('link', { name: 'contact' })
    act(() => pill.focus())
    expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
    expect(spy.mock.contexts.at(-1)).toBe(pill)
    spy.mockRestore()
  })

  it('"ask VINCE" opens VINCE through the vince:open event', async () => {
    const onOpen = vi.fn()
    window.addEventListener('vince:open', onOpen)
    render(<Header />)
    const btn = screen.getByRole('button', { name: 'ask VINCE' })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    expect(btn).toHaveAttribute('data-vince-trigger')
    await userEvent.click(btn)
    expect(onOpen).toHaveBeenCalledTimes(1)
    window.removeEventListener('vince:open', onOpen)
  })

  it('has the theme, customize and motion tools', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: 'Customize' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed')
    expect(screen.getByRole('button', { name: /^Theme: (dark|light)$/ })).toBeInTheDocument()
  })
})
