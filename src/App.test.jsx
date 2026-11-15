import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { tourSteps, briefNarration } from './agent/vince.js'

// The whole page in jsdom: the cross-module contracts (nav anchors, VINCE's tour and brief targets)
// and the 30-second brief switch, which App owns.
const renderApp = () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // lazy sections may log in jsdom
  return render(<App />)
}

describe('App', () => {
  it('has a section for every header nav link', async () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    for (const a of within(nav).getAllByRole('link')) expect(document.getElementById(a.getAttribute('href').slice(1))).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(document.getElementById('main')).not.toBeNull()
  })

  it("has every section VINCE's guided tour visits", () => {
    renderApp()
    for (const s of tourSteps()) expect(document.getElementById(s.target), s.target).not.toBeNull()
    // "At a glance" is the hero's dialog button now, not a section.
    expect(document.getElementById('glance')).toHaveAccessibleName('At a glance')
    expect(document.getElementById('impact')).toBeNull()
  })

  it('puts the domain graph right after "How I lead", and "At a glance" in the hero beside Email', () => {
    renderApp()
    const blocks = [...document.getElementById('main').children]
    const lead = blocks.findIndex((el) => el.id === 'lead')
    expect(lead).toBeGreaterThan(-1)
    expect(blocks[lead + 1]).toHaveClass('layout')
    expect(within(blocks[lead + 1]).getByRole('heading', { name: 'Domain graph', level: 2 })).toBeInTheDocument()
    expect(blocks[lead + 2]).toHaveAttribute('id', 'projects')
    expect(blocks.map((el) => el.id).filter(Boolean)).toEqual(['top', 'lead', 'projects', 'experience', 'fit', 'skills', 'credentials', 'blogs', 'contact'])
    const hero = document.getElementById('top')
    expect(within(hero).getByRole('button', { name: 'Email' }).closest('.email').nextElementSibling).toBe(within(hero).getByRole('button', { name: 'At a glance' }))
  })

  it('the 30-second brief switch shows the brief, moves focus to it, and Back returns', async () => {
    const user = userEvent.setup()
    renderApp()
    const sw = screen.getByRole('switch', { name: '30-second brief' })
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.dataset.mode).toBe('brief')
    expect(new URL(window.location.href).searchParams.get('brief')).toBe('1')
    const heading = screen.getByRole('heading', { level: 1, name: /^30-second brief:\s*Vinod Pyarelal Yadav$/ })
    await waitFor(() => expect(heading).toHaveFocus())
    // Every part VINCE highlights while narrating the brief is there.
    for (const s of briefNarration()) expect(document.querySelector(`[data-brief="${s.target}"]`), s.target).not.toBeNull()

    await user.click(screen.getAllByRole('button', { name: /Back to full profile/ })[0])
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-mode')
    expect(window.location.search).toBe('')
    await waitFor(() => expect(sw).toHaveFocus())
  })

  it('Escape leaves the brief and returns focus to the switch', async () => {
    const user = userEvent.setup()
    renderApp()
    const sw = screen.getByRole('switch', { name: '30-second brief' })
    await user.click(sw)
    await user.keyboard('{Escape}')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await waitFor(() => expect(sw).toHaveFocus())
  })

  it('opens in brief mode from ?brief=1', () => {
    history.replaceState(null, '', '/?brief=1')
    renderApp()
    expect(screen.getByRole('switch', { name: '30-second brief' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('region', { name: /30-second brief/ })).toBeInTheDocument()
  })

  it("VINCE's tour leaves brief mode (brief:exit)", () => {
    history.replaceState(null, '', '/?brief=1')
    renderApp()
    act(() => window.dispatchEvent(new Event('brief:exit')))
    expect(screen.getByRole('switch', { name: '30-second brief' })).toHaveAttribute('aria-checked', 'false')
  })

  it('loads the role-fit section after mount', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Check role fit', level: 2 }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Paste a job description' })).toBeInTheDocument()
  })
})
