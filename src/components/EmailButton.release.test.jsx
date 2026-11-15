import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render as prerender } from '../entry-server.jsx'
import Brief from './Brief.jsx'
import Contact from './Contact.jsx'
import EmailButton from './EmailButton.jsx'
import Hero from './Hero.jsx'
import { setHelpOff } from './mailtoCheck.js'
import ProfileDialog from './ProfileDialog.jsx'

// Release run, 15 Nov 2026 (after fixes): the shared Email chooser (EmailButton.jsx, mailtoCheck.js) in
// every place it's used (Hero, Brief, ProfileDialog, Contact), and the cases EmailButton.test.jsx leaves
// open: the no-JS markup everywhere, one menu at a time, no notice after Outlook or Copy, "Don't show this
// again" when storage throws, and Escape inside the profile dialog and the brief.

const EMAIL = 'yadav.vinod579@gmail.com'
const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const expanded = () => [...document.querySelectorAll('button[aria-controls][aria-expanded="true"]')].filter((b) => b.closest('.email'))
const menuOf = (button) => document.getElementById(button.getAttribute('aria-controls'))

// Fake timers for the 1.5 s check: user-event waits on timers, so these use fireEvent inside act.
const click = (el) => act(() => { fireEvent.click(el) })
const escape = () => act(() => { fireEvent.keyDown(document.activeElement, { key: 'Escape' }) })
const wait = (ms) => act(() => vi.advanceTimersByTime(ms))
// jsdom can't navigate to mailto:; stop the default so it doesn't log "not implemented".
const noNav = (e) => e.target.closest?.('a[href^="mailto:"]') && e.preventDefault()
const watchable = () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(WIN)
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  document.addEventListener('click', noNav)
}
const openMailApp = async (button) => {
  await click(button)
  await click(within(menuOf(button)).getByRole('link', { name: 'Open mail app' }))
}

afterEach(() => {
  document.removeEventListener('click', noNav)
  vi.useRealTimers()
  delete navigator.clipboard
})

describe('without JavaScript (prerendered markup) every Email is a plain mailto: link', () => {
  const mailtoAnchors = (html) => [...html.matchAll(/<a\b[^>]*href="mailto:([^"?]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [m[1], m[2]])

  it('the prerendered page (entry-server): the hero Email and the Contact address', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = prerender()
    const links = mailtoAnchors(html)
    expect(links).toEqual(expect.arrayContaining([[EMAIL, 'Email'], [EMAIL, EMAIL]]))
    // No chooser markup before hydration: no disclosure button, no menu, no "Open mail app".
    expect(html).not.toMatch(/class="email"|email__menu|Open mail app/)
  })

  it.each([
    ['Hero', () => <Hero brief={false} onToggleBrief={() => {}} />],
    ['Brief', () => <Brief onClose={() => {}} />],
    ['ProfileDialog', () => <ProfileDialog titleId="t" />],
    ['Contact', () => <Contact />],
  ])('%s', (_, El) => {
    const html = renderToString(<El />)
    const links = mailtoAnchors(html).filter(([to]) => to === EMAIL)
    expect(links.length).toBeGreaterThanOrEqual(1)
    expect(html).not.toMatch(/email__menu|Open mail app/)
  })
})

describe('only one Email menu is open at a time', () => {
  it('opening a second chooser (Contact) closes the first (Hero)', async () => {
    const user = userEvent.setup()
    render(<><Hero brief={false} onToggleBrief={() => {}} /><Contact /></>)
    const hero = screen.getByRole('button', { name: 'Email' })
    const contact = screen.getByRole('button', { name: EMAIL })
    await user.click(hero)
    expect(expanded()).toEqual([hero])
    await user.click(contact)
    expect(expanded()).toEqual([contact])
    expect(menuOf(hero)).not.toBeVisible()
    expect(contact).toHaveFocus()
  })

  // TEST-008: closing the chooser doesn't cancel the pending "Open mail app" check, so 1.5 s later the
  // closed chooser reopens as the notice, next to (or instead of) whatever the visitor moved on to.
  it('TEST-008: "Open mail app" then another chooser: the first doesn\'t reopen as a notice 1.5 s later', async () => {
    watchable()
    render(<><Hero brief={false} onToggleBrief={() => {}} /><Contact /></>)
    const hero = screen.getByRole('button', { name: 'Email' })
    const contact = screen.getByRole('button', { name: EMAIL })
    await openMailApp(hero)
    await click(contact)
    expect(expanded()).toEqual([contact])
    await wait(1500)
    expect(expanded()).toEqual([contact])
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('TEST-008: Escape after "Open mail app" closes the chooser for good (no notice 1.5 s later, focus stays)', async () => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await escape()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    await wait(1500)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('TEST-008: an outside click after "Open mail app" closes the chooser for good', async () => {
    watchable()
    render(<><EmailButton /><p>Plain text</p></>)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await click(screen.getByText('Plain text'))
    await wait(1500)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggling the button closed after "Open mail app" does cancel the check (control for TEST-008)', async () => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await click(button)
    await wait(1500)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('the "no email app opened" notice is not shown after another choice', () => {
  it.each([
    ['Gmail', (m) => m.getByRole('link', { name: /^Gmail/ })],
    ['Outlook.com', (m) => m.getByRole('link', { name: /^Outlook\.com/ })],
    ['Outlook (work)', (m) => m.getByRole('link', { name: /^Outlook \(work\)/ })],
  ])('after %s: the chooser closes and stays closed', async (_, pick) => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await click(pick(within(menuOf(button))))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await wait(3000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('after Copy address: the menu stays open with "Copied", and no notice replaces it', async () => {
    watchable()
    render(<EmailButton />)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(() => Promise.resolve()) }, configurable: true })
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await click(within(menuOf(button)).getByRole('button', { name: 'Copy address' }))
    await wait(3000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(within(menuOf(button)).getByRole('status')).toHaveTextContent(`Copied ${EMAIL}`)
  })

  it('Outlook inside the notice closes it (no second notice)', async () => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await wait(1500)
    await click(within(screen.getByRole('alertdialog')).getByRole('link', { name: /^Outlook\.com/ }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await wait(3000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

describe('"Don\'t show this again" when storage throws', () => {
  // Blocked cookies / storage: setItem (and often getItem) throw. The choice should still hold for the
  // rest of the visit, otherwise the button does nothing visible and the notice keeps coming back.
  it('TEST-009: is honoured for the visit when localStorage.setItem throws', async () => {
    watchable()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked', 'QuotaExceededError') })
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await wait(1500)
    await click(screen.getByRole('button', { name: 'Don’t show this again' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await openMailApp(button)
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('TEST-009: is honoured for the visit when every localStorage call throws', async () => {
    watchable()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await wait(1500)
    await click(screen.getByRole('button', { name: 'Don’t show this again' }))
    await openMailApp(button)
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('never crashes the chooser when storage throws, and the notice still works', async () => {
    watchable()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    await wait(1500)
    expect(screen.getByRole('alertdialog', { name: 'Didn’t open?' })).toHaveFocus()
    await click(screen.getByRole('button', { name: 'Don’t show this again' }))
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('inside the profile dialog and the 30-second brief, Escape closes only the chooser', () => {
  // Browsers close a modal <dialog> on Escape (a "close request") unless the keydown was cancelled.
  // jsdom doesn't, so emulate that default action on the dialog.
  const nativeEscape = (dialog) =>
    dialog.addEventListener('keydown', (e) => e.key === 'Escape' && !e.defaultPrevented && dialog.close())

  const openProfile = async (user) => {
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await user.click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    nativeEscape(dialog)
    return dialog
  }

  it('profile dialog: the first Escape closes the menu, the dialog stays open; the second closes the dialog', async () => {
    const user = userEvent.setup()
    const dialog = await openProfile(user)
    expect(dialog).toHaveAttribute('open')
    const email = within(dialog).getByRole('button', { name: 'Email' })
    await user.click(email)
    expect(email).toHaveAttribute('aria-expanded', 'true')
    await user.tab()
    expect(within(menuOf(email)).getByRole('link', { name: 'Open mail app' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(email).toHaveAttribute('aria-expanded', 'false')
    expect(dialog).toHaveAttribute('open')
    expect(email).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(dialog).not.toHaveAttribute('open')
  })

  it('profile dialog: Escape on the notice closes the notice, not the dialog', async () => {
    watchable()
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    nativeEscape(dialog)
    const email = within(dialog).getByRole('button', { name: 'Email' })
    await openMailApp(email)
    await wait(1500)
    expect(within(dialog).getByRole('alertdialog')).toHaveFocus()
    await escape()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(dialog).toHaveAttribute('open')
    expect(email).toHaveFocus()
  })

  it('profile dialog: closing the dialog with a check pending shows no notice later', async () => {
    watchable()
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    await openMailApp(within(dialog).getByRole('button', { name: 'Email' }))
    await click(within(dialog).getByRole('button', { name: /Close dialog/ }))
    expect(dialog).not.toHaveAttribute('open')
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('brief: the first Escape closes the menu and stays in the brief; the second leaves the brief', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Brief onClose={onClose} />)
    const email = screen.getByRole('button', { name: 'Email' })
    await user.click(email)
    await user.keyboard('{Escape}')
    expect(email).toHaveAttribute('aria-expanded', 'false')
    expect(email).toHaveFocus()
    expect(onClose).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('brief: Escape on the notice closes the notice and stays in the brief', async () => {
    watchable()
    const onClose = vi.fn()
    render(<Brief onClose={onClose} />)
    const email = screen.getByRole('button', { name: 'Email' })
    await openMailApp(email)
    await wait(1500)
    expect(screen.getByRole('alertdialog')).toHaveFocus()
    await escape()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    expect(email).toHaveFocus()
  })

  it('brief: a click inside the open menu does not leave the brief', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Brief onClose={onClose} />)
    const email = screen.getByRole('button', { name: 'Email' })
    await user.click(email)
    await user.click(within(menuOf(email)).getByText(EMAIL))
    expect(onClose).not.toHaveBeenCalled()
    expect(email).toHaveAttribute('aria-expanded', 'true')
  })
})

// FUNC-021 (fixed in the release round): the menu was absolutely positioned inside Contact's and the
// brief's .card (overflow: hidden) and the profile dialog (overflow: auto), which clipped it. Now it's a
// manual popover in the top layer, fixed and placed from the button's rectangle. jsdom has no layout or
// top layer: the Popover API stand-in (src/test/setup.js) records showPopover() in data-popover-open, and
// rectangles are stubbed. The real hit-testing runs in a browser (the release run's scratchpad scripts).
const box = ({ left, top, width, height }) => () => ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() {} })
const innerHeight = window.innerHeight
const viewport = (width, height) => {
  window.innerHeight = height
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: width })
  Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: height })
}
afterEach(() => {
  window.innerHeight = innerHeight
  delete document.documentElement.clientWidth
  delete document.documentElement.clientHeight
})

describe('FUNC-021: the menu is shown in the top layer, so no container clips it', () => {
  it.each([
    ['Contact', () => render(<Contact />), () => screen.getByRole('button', { name: EMAIL }), '.card'],
    ['Brief', () => render(<Brief onClose={() => {}} />), () => screen.getByRole('button', { name: 'Email' }), 'section.card#brief'],
    ['ProfileDialog', () => render(<ProfileDialog titleId="t" />), () => screen.getByRole('button', { name: 'Email' }), '.actions'],
  ])('%s: a manual popover, shown when it opens and hidden when it closes', async (_, mount, getButton, container) => {
    const user = userEvent.setup()
    mount()
    const button = getButton()
    const menu = menuOf(button)
    expect(button.closest(container)).not.toBeNull()
    expect(menu).toHaveAttribute('popover', 'manual')
    expect(menu).not.toHaveAttribute('data-popover-open')
    await user.click(button)
    expect(menu).toHaveAttribute('data-popover-open')
    expect(menu).toBeVisible()
    for (const name of ['Open mail app', /^Gmail/, /^Outlook\.com/, /^Outlook \(work\)/]) expect(within(menu).getByRole('link', { name })).toBeVisible()
    expect(within(menu).getByRole('button', { name: 'Copy address' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(menu).not.toHaveAttribute('data-popover-open')
    expect(menu).not.toBeVisible()
    expect(button).toHaveFocus()
  })

  it('profile dialog: the popover opens after the modal dialog (so it is drawn above it) and stays in its subtree (not inert)', async () => {
    const user = userEvent.setup()
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    const showPopover = vi.spyOn(HTMLElement.prototype, 'showPopover')
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await user.click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    const email = within(dialog).getByRole('button', { name: 'Email' })
    await user.click(email)
    const menu = menuOf(email)
    expect(showPopover).toHaveBeenCalledTimes(1)
    expect(showPopover.mock.contexts[0]).toBe(menu)
    expect(showPopover.mock.invocationCallOrder[0]).toBeGreaterThan(showModal.mock.invocationCallOrder.at(-1))
    expect(dialog.contains(menu)).toBe(true)
    expect(menu).toBeVisible()
  })

  it('the stylesheet makes it fixed (not absolute), undoes the centred [popover] style, and caps its height (UI-014)', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    const rule = css.match(/^\.email__menu \{([^}]*)\}/m)?.[1]
    expect(rule).toBeDefined()
    expect(rule).toMatch(/position: fixed;/)
    expect(rule).not.toMatch(/position: absolute/)
    expect(rule).toMatch(/inset: auto;/)
    expect(rule).toMatch(/margin: 0;/)
    expect(rule).toMatch(/max-height: calc\(100dvh - 16px\);/)
    expect(rule).toMatch(/overflow: auto;/)
    expect(css).not.toMatch(/\.email__menu--up/)
  })

  describe('placement from the button\'s rectangle', () => {
    const open = async (vw, vh, buttonBox, menuBox) => {
      viewport(vw, vh)
      render(<EmailButton />)
      const button = screen.getByRole('button', { name: 'Email' })
      const menu = menuOf(button)
      button.getBoundingClientRect = box(buttonBox)
      menu.getBoundingClientRect = box({ left: 0, top: 0, ...menuBox })
      await click(button)
      return { button, menu }
    }

    it('below the button, aligned with its left edge', async () => {
      const { menu } = await open(1440, 900, { left: 100, top: 300, width: 120, height: 40 }, { width: 240, height: 266 })
      expect(menu.style.top).toBe('346px')
      expect(menu.style.left).toBe('100px')
    })

    it('above the button when there is no room below (Contact, at the bottom of the page)', async () => {
      const { menu } = await open(1440, 900, { left: 100, top: 800, width: 120, height: 40 }, { width: 240, height: 266 })
      expect(menu.style.top).toBe(`${800 - 6 - 266}px`)
    })

    it('shifted left to stay 8px inside the viewport', async () => {
      const { menu } = await open(390, 844, { left: 250, top: 300, width: 120, height: 40 }, { width: 240, height: 266 })
      expect(menu.style.left).toBe(`${390 - 8 - 240}px`)
    })

    it('UI-014: a notice that fits neither below nor above is clamped inside a 360 × 640 screen', async () => {
      const { menu } = await open(360, 640, { left: 20, top: 150, width: 120, height: 40 }, { width: 344, height: 600 })
      const top = parseInt(menu.style.top, 10)
      expect(top).toBeGreaterThanOrEqual(8)
      expect(top + 600).toBeLessThanOrEqual(640 - 8)
    })

    it('follows the button when the page or a container scrolls, and when the window resizes', async () => {
      const { button, menu } = await open(1440, 900, { left: 100, top: 300, width: 120, height: 40 }, { width: 240, height: 266 })
      button.getBoundingClientRect = box({ left: 100, top: 200, width: 120, height: 40 })
      act(() => { fireEvent.scroll(document.body) }) // any element's scroll reaches the capture listener
      expect(menu.style.top).toBe('246px')
      button.getBoundingClientRect = box({ left: 60, top: 200, width: 120, height: 40 })
      act(() => { window.dispatchEvent(new Event('resize')) })
      expect(menu.style.left).toBe('60px')
    })
  })
})

describe('FUNC-021 fallback, without the Popover API: portalled out of the container, still fixed', () => {
  let showPopover
  beforeEach(() => {
    showPopover = HTMLElement.prototype.showPopover
    delete HTMLElement.prototype.showPopover
  })
  afterEach(() => {
    HTMLElement.prototype.showPopover = showPopover
  })

  it('Contact: the menu is a child of <body>, outside the card; Tab, Shift+Tab, clicks inside and Escape still work', async () => {
    const user = userEvent.setup()
    render(<><Contact /><p>Plain text</p></>)
    const button = screen.getByRole('button', { name: EMAIL })
    await user.click(button)
    const menu = menuOf(button)
    expect(menu).not.toHaveAttribute('popover')
    expect(menu.parentElement).toBe(document.body)
    expect(menu.closest('.card')).toBeNull()
    expect(menu).toBeVisible()
    await user.tab()
    expect(within(menu).getByRole('link', { name: 'Open mail app' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(button).toHaveFocus()
    await user.click(within(menu).getByText(EMAIL))
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('Tab past the last choice closes the menu and returns to the button', async () => {
    const user = userEvent.setup()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await user.click(button)
    for (let i = 0; i < 5; i++) await user.tab()
    expect(within(menuOf(button)).getByRole('button', { name: 'Copy address' })).toHaveFocus()
    await user.tab()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('profile dialog: portalled into the dialog (everything outside a modal dialog is inert); Escape closes only the menu', async () => {
    const user = userEvent.setup()
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await user.click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    dialog.addEventListener('keydown', (e) => e.key === 'Escape' && !e.defaultPrevented && dialog.close())
    const email = within(dialog).getByRole('button', { name: 'Email' })
    await user.click(email)
    const menu = menuOf(email)
    expect(menu.parentElement).toBe(dialog)
    expect(menu.closest('.actions')).toBeNull()
    await user.keyboard('{Escape}')
    expect(email).toHaveAttribute('aria-expanded', 'false')
    expect(dialog).toHaveAttribute('open')
  })

  it('brief: a click inside the portalled menu does not leave the brief', async () => {
    viewport(1200, 800)
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Brief onClose={onClose} />)
    const email = screen.getByRole('button', { name: 'Email' })
    await user.click(email)
    expect(menuOf(email).closest('#brief')).toBeNull()
    await user.click(within(menuOf(email)).getByText(EMAIL))
    expect(onClose).not.toHaveBeenCalled()
    expect(email).toHaveAttribute('aria-expanded', 'true')
  })
})

// FUNC-022 (fixed in the release round): in the brief, a click on blank space with the menu open also left
// the brief, and focus dropped to <body>.
describe('FUNC-022: in the brief, an outside press with the Email menu open closes only the menu', () => {
  const press = (target) => {
    fireEvent.pointerDown(target, { button: 0, isPrimary: true, clientX: 20, clientY: 20 })
    fireEvent.pointerUp(target, { button: 0, isPrimary: true, clientX: 20, clientY: 20 })
    fireEvent.click(target)
  }

  it.each([['with the Popover API', false], ['without it (portalled)', true]])('%s', async (_, fallback) => {
    const showPopover = HTMLElement.prototype.showPopover
    if (fallback) delete HTMLElement.prototype.showPopover
    try {
      viewport(1200, 800)
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<Brief onClose={onClose} />)
      const email = screen.getByRole('button', { name: 'Email' })
      await user.click(email)
      act(() => press(document.body))
      expect(onClose).not.toHaveBeenCalled()
      expect(email).toHaveAttribute('aria-expanded', 'false')
      expect(email).toHaveFocus()
      // With the menu closed, the next press on blank space leaves the brief as before.
      act(() => press(document.body))
      expect(onClose).toHaveBeenCalledWith({ keepFocus: true })
    } finally {
      HTMLElement.prototype.showPopover = showPopover
    }
  })

  it('the same with the "Didn’t open?" notice showing', async () => {
    watchable()
    viewport(1200, 800)
    const onClose = vi.fn()
    render(<Brief onClose={onClose} />)
    const email = screen.getByRole('button', { name: 'Email' })
    await openMailApp(email)
    await wait(1500)
    expect(screen.getByRole('alertdialog')).toHaveFocus()
    act(() => press(document.body))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(email).toHaveFocus()
  })
})

// UX-020 (fixed in the release round): after "Open mail app" worked, the menu stayed open.
describe('UX-020: when "Open mail app" works (the page loses focus or hides), the menu closes', () => {
  it('on blur: closed, focus back on Email for when the visitor returns, and no notice later', async () => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await wait(100)
    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(menuOf(button)).not.toBeVisible()
    expect(menuOf(button)).not.toHaveAttribute('data-popover-open')
    expect(button).toHaveFocus()
    await wait(3000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('when the page is hidden', async () => {
    watchable()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    vis.mockRestore()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('also when the visitor turned the notice off', async () => {
    watchable()
    setHelpOff()
    render(<EmailButton />)
    const button = screen.getByRole('button', { name: 'Email' })
    await openMailApp(button)
    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('in the profile dialog: the menu closes, the dialog stays open', async () => {
    watchable()
    render(<Hero brief={false} onToggleBrief={() => {}} />)
    await click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = document.querySelector('dialog.gdialog--profile')
    const email = within(dialog).getByRole('button', { name: 'Email' })
    await openMailApp(email)
    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(email).toHaveAttribute('aria-expanded', 'false')
    expect(dialog).toHaveAttribute('open')
    expect(email).toHaveFocus()
  })
})
