import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EmailButton, { emailLinks } from './EmailButton.jsx'
import Contact from './Contact.jsx'

const EMAIL = 'yadav.vinod579@gmail.com'

const setup = (props) => {
  const user = userEvent.setup()
  render(
    <div>
      <EmailButton {...props} />
      <button type="button">Elsewhere</button>
      <p>Plain text</p>
    </div>,
  )
  const button = screen.getByRole('button', { name: props?.label ?? 'Email' })
  return { user, button, menu: () => document.getElementById(button.getAttribute('aria-controls')) }
}

const stubClipboard = (writeText) => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

afterEach(() => {
  delete navigator.clipboard
  delete document.execCommand
})

describe('EmailButton', () => {
  it('without JavaScript (server markup) is a plain mailto: link', () => {
    const html = renderToString(<EmailButton />)
    expect(html).toMatch(new RegExp(`^<a class="btn btn--primary" href="mailto:${EMAIL.replace(/\./g, '\\.')}">Email</a>$`))
    expect(renderToString(<Contact />)).toContain(`href="mailto:${EMAIL}">${EMAIL}</a>`)
  })

  it('after hydration is a disclosure button that controls a hidden menu', () => {
    const { button, menu } = setup()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveClass('btn', 'btn--primary')
    expect(menu()).not.toBeVisible()
  })

  it('opens on click and shows the address and the five choices', async () => {
    const { user, button, menu } = setup()
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(menu()).toBeVisible()
    expect(within(menu()).getByText(EMAIL)).toBeInTheDocument()
    const m = within(menu())
    expect(m.getByRole('link', { name: 'Open mail app' })).toBeInTheDocument()
    expect(m.getByRole('link', { name: /^Gmail/ })).toBeInTheDocument()
    expect(m.getByRole('link', { name: /^Outlook\.com/ })).toBeInTheDocument()
    expect(m.getByRole('link', { name: /^Outlook \(work\)/ })).toBeInTheDocument()
    expect(m.getByRole('button', { name: 'Copy address' })).toBeInTheDocument()
    expect(m.getAllByRole('listitem')).toHaveLength(5)
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens with Enter and Space', async () => {
    const { user, button } = setup()
    button.focus()
    await user.keyboard('{Enter}')
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard(' ')
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('links have encoded hrefs; web mail opens in a new tab', async () => {
    const { user, button, menu } = setup()
    await user.click(button)
    const m = within(menu())
    const su = 'Hello%20from%20your%20profile%20site'
    expect(m.getByRole('link', { name: 'Open mail app' })).toHaveAttribute('href', `mailto:${EMAIL}?subject=${su}`)
    const gmail = m.getByRole('link', { name: /^Gmail\s*\(opens in a new tab\)$/ })
    expect(gmail).toHaveAttribute('href', `https://mail.google.com/mail/?view=cm&fs=1&to=yadav.vinod579%40gmail.com&su=${su}`)
    // FUNC-023: personal Outlook.com and work or school (Microsoft 365) mailboxes have different compose links.
    const outlook = m.getByRole('link', { name: /^Outlook\.com\s*\(opens in a new tab\)$/ })
    expect(outlook).toHaveAttribute('href', `https://outlook.live.com/mail/0/deeplink/compose?to=yadav.vinod579%40gmail.com&subject=${su}`)
    const work = m.getByRole('link', { name: /^Outlook \(work\)\s*\(opens in a new tab\)$/ })
    expect(work).toHaveAttribute('href', `https://outlook.office.com/mail/deeplink/compose?to=yadav.vinod579%40gmail.com&subject=${su}`)
    for (const a of [gmail, outlook, work]) {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    }
    // Reserved characters are encoded in every parameter.
    const l = emailLinks('a+b@c.io', 'Q&A? 100% #1')
    expect(l.gmail).toBe('https://mail.google.com/mail/?view=cm&fs=1&to=a%2Bb%40c.io&su=Q%26A%3F%20100%25%20%231')
    expect(l.outlook).toBe('https://outlook.live.com/mail/0/deeplink/compose?to=a%2Bb%40c.io&subject=Q%26A%3F%20100%25%20%231')
    expect(l.outlookWork).toBe('https://outlook.office.com/mail/deeplink/compose?to=a%2Bb%40c.io&subject=Q%26A%3F%20100%25%20%231')
    // Spaces are %20, never "+" (a signed-out Outlook redirect turns "+" into "++").
    for (const url of Object.values(emailLinks())) expect(url).not.toMatch(/\+/)
    expect(l.mailto).toBe('mailto:a+b@c.io?subject=Q%26A%3F%20100%25%20%231')
  })

  it('Escape closes it and returns focus to the button, marked as handled', async () => {
    const onKey = vi.fn((e) => e.defaultPrevented)
    document.addEventListener('keydown', onKey)
    const { user, button, menu } = setup()
    await user.click(button)
    await user.tab()
    expect(within(menu()).getByRole('link', { name: 'Open mail app' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    expect(onKey).toHaveLastReturnedWith(true) // so Brief's Escape handler doesn't also leave brief mode
    document.removeEventListener('keydown', onKey)
  })

  it('an outside click closes it; focus returns to the button unless the click focuses something else', async () => {
    const { user, button } = setup()
    await user.click(button)
    await user.click(screen.getByText('Plain text'))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
    await user.click(button)
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
  })

  it('tabbing out of the menu closes it', async () => {
    const { user, button } = setup()
    await user.click(button)
    for (let i = 0; i < 6; i++) await user.tab()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Copy address" copies it and announces it', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const { user, button, menu } = setup()
    stubClipboard(writeText) // after setup: user-event installs its own clipboard
    await user.click(button)
    const status = within(menu()).getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toBeEmptyDOMElement()
    await user.click(within(menu()).getByRole('button', { name: 'Copy address' }))
    expect(writeText).toHaveBeenCalledWith(EMAIL)
    expect(status).toHaveTextContent(`Copied ${EMAIL}`)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('without the Clipboard API, copies with execCommand', async () => {
    const { user, button, menu } = setup()
    delete navigator.clipboard
    document.execCommand = vi.fn(() => true)
    await user.click(button)
    await user.click(within(menu()).getByRole('button', { name: 'Copy address' }))
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(within(menu()).getByRole('status')).toHaveTextContent(`Copied ${EMAIL}`)
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('when nothing can copy, selects the address and says how to copy it', async () => {
    const { user, button, menu } = setup()
    stubClipboard(vi.fn(() => Promise.reject(new Error('denied'))))
    document.execCommand = vi.fn(() => false)
    await user.click(button)
    await user.click(within(menu()).getByRole('button', { name: 'Copy address' }))
    expect(within(menu()).getByRole('status')).toHaveTextContent('Address selected. Press Ctrl+C')
    expect(window.getSelection().toString()).toBe(EMAIL)
  })

  it('Contact keeps the address as the button text', () => {
    render(<Contact />)
    expect(screen.getByRole('button', { name: EMAIL })).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('EmailButton: no email app notice', () => {
  const WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
  // jsdom can't navigate to mailto:; stop the default so it doesn't log "not implemented".
  const noNav = (e) => e.target.closest?.('a[href^="mailto:"]') && e.preventDefault()

  const start = async (ua = WIN) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    document.addEventListener('click', noNav)
    const s = setup()
    // fireEvent, not user-event: user-event waits on timers, which are fake here.
    s.user = { click: async (el) => act(() => { fireEvent.click(el) }), escape: async () => act(() => { fireEvent.keyDown(document.activeElement, { key: 'Escape' }) }) }
    await s.user.click(s.button)
    await s.user.click(within(s.menu()).getByRole('link', { name: 'Open mail app' }))
    return s
  }
  const wait = (ms) => act(() => vi.advanceTimersByTime(ms))

  afterEach(() => {
    document.removeEventListener('click', noNav)
    vi.useRealTimers()
  })

  it('shows the notice with Windows steps and takes focus when nothing opened', async () => {
    const { button } = await start(WIN)
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await wait(1500)
    // UX-019: a guess, worded as one, and the body doesn't repeat the title.
    const notice = screen.getByRole('alertdialog', { name: 'Didn’t open?' })
    expect(notice).toHaveFocus()
    expect(notice).toHaveAccessibleDescription(/^If no email app opened, your device may not have one set for email links\./)
    expect(notice).not.toHaveTextContent(/No email app opened|Looks like/)
    expect(notice).toHaveTextContent('search for "MAILTO"')
    expect(notice).toHaveTextContent('click the handler icon at the right of the address bar, and choose Allow')
    const n = within(notice)
    expect(n.getByRole('link', { name: /^Gmail/ })).toHaveAttribute('href', expect.stringContaining('mail.google.com'))
    expect(n.getByRole('link', { name: /^Outlook\.com/ })).toHaveAttribute('href', expect.stringContaining('outlook.live.com'))
    expect(n.getByRole('link', { name: /^Outlook \(work\)/ })).toHaveAttribute('href', expect.stringContaining('outlook.office.com'))
    expect(n.getByRole('button', { name: 'Copy address' })).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Mac steps on a Mac, without the Chrome tip in Safari', async () => {
    await start(MAC)
    await wait(1500)
    const notice = screen.getByRole('alertdialog')
    expect(notice).toHaveTextContent('Default email reader')
    expect(notice).not.toHaveTextContent('address bar')
  })

  it('shows nothing when the page loses focus in time (an app or prompt opened)', async () => {
    await start()
    await wait(400)
    act(() => window.dispatchEvent(new Event('blur')))
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('shows nothing when the visitor picks Gmail first', async () => {
    const { user, menu } = await start()
    await user.click(within(menu()).getByRole('link', { name: /^Gmail/ }))
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('Close and Escape return focus to the Email button', async () => {
    const { user, button } = await start()
    await wait(1500)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute('aria-expanded', 'false')

    await user.click(button)
    await user.click(screen.getByRole('link', { name: 'Open mail app' }))
    await wait(1500)
    expect(screen.getByRole('alertdialog')).toHaveFocus()
    await user.escape()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(button).toHaveFocus()
  })

  it('"Don\'t show this again" is remembered', async () => {
    const { user, button } = await start()
    await wait(1500)
    await user.click(screen.getByRole('button', { name: 'Don’t show this again' }))
    expect(localStorage.getItem('mailto-help-off')).toBe('1')
    expect(button).toHaveFocus()
    await user.click(button)
    await user.click(screen.getByRole('link', { name: 'Open mail app' }))
    await wait(2000)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
