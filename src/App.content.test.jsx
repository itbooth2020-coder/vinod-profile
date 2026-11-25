import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import * as data from './data.js'
import { media } from './agent/media.js'
import { tourSteps, briefNarration } from './agent/vince.js'
import { namedBanks } from './test/bankMentions.js'

// Page-level contracts for the 15 Nov 2026 changes (t15): page and nav order, the tour's targets in page
// order, the client named only as "a global bank" (its name appears nowhere; namedBanks flags any named bank),
// and no DOB, age or phone number.
// A phone number: 10+ digits, optionally with +, spaces, dots, dashes or brackets. Years, ranges
// ("2016 – 2024") and figures ("10,000+") don't reach 10 digits in one run.
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?){2,4}\d{3,5}/g
const phonesIn = (text) => (text.match(PHONE) || []).filter((m) => m.replace(/\D/g, '').length >= 10)
const DOB = /date of birth|\bdob\b|\bborn\b|years old|\bage\s*[:=]?\s*\d|\b(19[6-9]\d|200\d)-\d{2}-\d{2}\b/i

const renderApp = () => {
  vi.spyOn(console, 'error').mockImplementation(() => {}) // lazy sections may log in jsdom
  return render(<App />)
}
// The page text with the At a glance dialog open, then with the profile dialog open (one modal at a time:
// jsdom makes the rest of the page inert while a modal is open, as browsers do).
const openBothDialogs = async (user) => {
  const texts = []
  // jsdom's name computation drops the space before the sr-only " about …" ("Moreabout Vinod Pyarelal").
  for (const name of ['At a glance', /^More\s*about/]) {
    await user.click(screen.getByRole('button', { name }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')
    texts.push(document.body.textContent)
    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
  }
  return texts.join('\n')
}
const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('App page order (t15)', () => {
  it('the header nav lists its sections in page order', () => {
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const targets = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((h) => h.startsWith('#'))
      .map((h) => document.getElementById(h.slice(1)))
    expect(targets.length).toBeGreaterThan(5)
    for (let i = 1; i < targets.length; i++) expect(before(targets[i - 1], targets[i]), `${targets[i - 1].id} before ${targets[i].id}`).toBe(true)
  })

  it("VINCE's tour visits its targets in page order, starting at the hero's At a glance button", () => {
    renderApp()
    const els = tourSteps().map((s) => document.getElementById(s.target))
    expect(els.every(Boolean)).toBe(true)
    for (let i = 1; i < els.length; i++) expect(before(els[i - 1], els[i]), `${els[i - 1].id} before ${els[i].id}`).toBe(true)
    expect(els[1]).toBe(screen.getByRole('button', { name: 'At a glance' }))
    expect(document.getElementById('top').contains(els[1])).toBe(true)
  })

  it('the domain graph sits between "How I lead" and "Key projects", and is not in the nav', () => {
    renderApp()
    const lead = screen.getByRole('region', { name: 'How I lead' })
    const graph = screen.getByRole('heading', { name: 'Domain graph', level: 2 })
    const projects = screen.getByRole('region', { name: 'Key projects' })
    expect(before(lead, graph)).toBe(true)
    expect(before(graph, projects)).toBe(true)
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(nav).queryByRole('link', { name: /graph|glance|impact/i })).toBeNull()
  })
})

describe('client named only as "a global bank" (t15)', () => {
  it("the client's name appears nowhere in the rendered page, its attributes or its dialogs", async () => {
    const user = userEvent.setup()
    renderApp()
    const text = await openBothDialogs(user)
    expect(namedBanks(text)).toEqual([])
    expect(namedBanks(document.body.innerHTML)).toEqual([])
    expect(namedBanks(document.head.innerHTML)).toEqual([])
  })

  it("the client's name appears nowhere in the 30-second brief", async () => {
    history.replaceState(null, '', '/?brief=1')
    renderApp()
    expect(namedBanks(screen.getByRole('region', { name: /30-second brief/ }).textContent)).toEqual([])
    expect(namedBanks(document.body.innerHTML)).toEqual([])
  })

  it("the client's name appears nowhere in the site data, media labels, tour or brief narration", () => {
    const blob = JSON.stringify({ ...data, media, tour: tourSteps(), brief: briefNarration() })
    expect(namedBanks(blob)).toEqual([])
    // The new project and its client.
    const bank = data.projects.find((p) => /^Global Bank\b/.test(p.name))
    expect(bank.caseStudy.client).toBe('A global bank')
    expect(blob).toMatch(/a global bank/i)
  })

  it("the client's name appears nowhere in index.html (static fallback and meta tags)", () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(namedBanks(html)).toEqual([])
  })
})

describe('no date of birth, age or phone number (t15)', () => {
  it('in the rendered page, including the At a glance and profile dialogs', async () => {
    const user = userEvent.setup()
    renderApp()
    const text = await openBothDialogs(user)
    expect(text).not.toMatch(DOB)
    expect(phonesIn(text)).toEqual([])
    expect(document.querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('in the 30-second brief', () => {
    history.replaceState(null, '', '/?brief=1')
    renderApp()
    const text = document.body.textContent
    expect(text).not.toMatch(DOB)
    expect(phonesIn(text)).toEqual([])
  })

  it('in the site data', () => {
    const blob = JSON.stringify(data)
    expect(blob).not.toMatch(/date of birth|\bdob\b|"born"|"age"|"phone"|"mobile"\s*:\s*"\+?\d/i)
    expect(phonesIn(blob)).toEqual([])
  })

  it('the phone pattern used here does catch phone numbers (self-check)', () => {
    expect(phonesIn('call +91 98765 43210 or 022-2345-6789')).toHaveLength(2)
    expect(phonesIn('Oct 2016 – May 2024, 10,000+ devices, ~3,000 apps, 20–50 engineers')).toEqual([])
  })
})

describe('the At a glance deep link on the full page (t15)', () => {
  it('#impact opens the dialog on load and Close returns focus to the hero button', () => {
    history.replaceState(null, '', '/#impact')
    renderApp()
    const dialog = screen.getByRole('dialog', { name: 'At a glance' })
    expect(dialog).toHaveAttribute('open')
    act(() => within(dialog).getByRole('button', { name: 'Close dialog' }).click())
    expect(dialog).not.toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'At a glance' })).toHaveFocus()
    expect(window.location.hash).toBe('')
  })

  it('#glance in brief mode leaves the brief and opens the dialog', async () => {
    history.replaceState(null, '', '/?brief=1#glance')
    document.documentElement.dataset.mode = 'brief' // index.html applies ?brief=1 before the app mounts
    renderApp()
    const dialog = await screen.findByRole('dialog', { name: 'At a glance' }, { timeout: 3000 })
    await vi.waitFor(() => expect(dialog).toHaveAttribute('open'))
    expect(screen.getByRole('switch', { name: '30-second brief' })).toHaveAttribute('aria-checked', 'false')
  })
})
