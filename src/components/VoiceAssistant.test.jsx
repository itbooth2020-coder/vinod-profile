import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The VINCE panel with the static site's setup: offline answers (VITE_LIVE_AGENT=false, setup.js)
// and no voice module loaded, so he works by text and nothing is spoken.
let VoiceAssistant
beforeEach(async () => {
  vi.resetModules() // a fresh conversation (agent/conversation.js) per test
  VoiceAssistant = (await import('./VoiceAssistant.jsx')).default
})

// The page around VINCE: an opener like the header's "ask VINCE".
function Page() {
  return (
    <>
      <button type="button" data-vince-trigger onClick={() => window.dispatchEvent(new Event('vince:open'))}>
        ask VINCE
      </button>
      <VoiceAssistant />
    </>
  )
}

const visible = (el) => {
  el.getClientRects = () => [{}] // jsdom has no layout: say the opener is on screen
  return el
}

const openFromHeader = async (user) => {
  render(<Page />)
  const opener = visible(screen.getByRole('button', { name: 'ask VINCE' }))
  await user.click(opener)
  const panel = screen.getByRole('dialog', { name: 'V.I.N.C.E.' })
  return { opener, panel }
}
const log = () => screen.getByRole('log', { name: 'Conversation with VINCE' })
const chips = () => within(screen.getByRole('group', { name: 'Suggested questions' })).getAllByRole('button')

describe('VoiceAssistant (VINCE)', () => {
  it('shows the launcher until opened', () => {
    render(<Page />)
    expect(screen.getByRole('button', { name: 'Ask VINCE' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on vince:open, takes focus, introduces himself and says answers are offline', async () => {
    const user = userEvent.setup()
    const { panel } = await openFromHeader(user)
    expect(panel).toHaveFocus()
    expect(panel).toHaveAccessibleDescription(/Virtual Intelligence for Navigating Career Experience\s*Offline · answers from the resume/)
    expect(within(log()).getByText(/^Good (morning|afternoon|evening)\. I'm VINCE:.*I search his profile/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask VINCE' })).not.toBeInTheDocument()
  })

  it('shows the Guided tour first, then two suggested questions', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    const buttons = chips()
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('Guided tour')
    // Suggestions are shuffled per visit and aren't all phrased as questions ("Show his career timeline").
    for (const b of buttons.slice(1)) expect(b.textContent).toMatch(/^(?!Guided tour)\S.{4,}$/)
    expect(buttons[1].textContent).not.toBe(buttons[2].textContent)
  })

  it('answers a typed question offline', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    const input = screen.getByRole('textbox', { name: 'Ask VINCE about Vinod' })
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()
    await user.type(input, 'Can I get his resume?')
    await user.click(send)
    expect(input).toHaveValue('')
    expect(within(log()).getByText('Can I get his resume?')).toBeInTheDocument()
    expect(await within(log()).findByText(/resume is available on request/, {}, { timeout: 3000 })).toBeInTheDocument()
    expect(within(log()).getByRole('link', { name: /^Open LinkedIn profile/ })).toHaveAttribute('target', '_blank')
    expect(fetch).not.toHaveBeenCalled()
    // A follow-up line and fresh suggestions after the answer.
    await waitFor(() => expect(chips()).toHaveLength(3))
    expect(chips()[0]).toHaveTextContent('Guided tour')
  })

  it('a suggested question chip asks it', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    const q = chips()[1].textContent
    await user.click(chips()[1])
    expect(within(log()).getByText(q)).toBeInTheDocument()
    await waitFor(() => expect(within(log()).queryByText('Accessing records…')).not.toBeInTheDocument(), { timeout: 3000 })
  })

  it('the Guided tour shows tour controls and Stop; Stop ends it', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    await user.click(screen.getByRole('button', { name: /Guided tour/ }))
    const tour = screen.getByRole('group', { name: 'Tour controls' })
    expect(within(tour).getByRole('button', { name: /Next stop/ })).toBeInTheDocument()
    expect(within(log()).getByText(/^Very well\. Let's begin\./)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Stop VINCE' }))
    expect(screen.queryByRole('group', { name: 'Tour controls' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop VINCE' })).not.toBeInTheDocument()
    expect(chips()[0]).toHaveTextContent('Guided tour')
  })

  it('"take the tour" typed in starts the tour', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    await user.type(screen.getByRole('textbox'), 'Take me on the tour{Enter}')
    expect(screen.getByRole('group', { name: 'Tour controls' })).toBeInTheDocument()
  })

  it('Escape closes the panel and returns focus to the control that opened it', async () => {
    const user = userEvent.setup()
    const { opener } = await openFromHeader(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('Close returns focus to the launcher when the opener is gone', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    screen.getByRole('button', { name: 'ask VINCE' }).getClientRects = () => [] // hidden now
    await user.click(screen.getByRole('button', { name: 'Close VINCE' }))
    expect(screen.getByRole('button', { name: 'Ask VINCE' })).toHaveFocus()
  })

  it('maximized is modal: Escape restores the panel first', async () => {
    const user = userEvent.setup()
    const { panel } = await openFromHeader(user)
    await user.click(screen.getByRole('button', { name: 'Maximize VINCE' }))
    expect(panel).toHaveAttribute('aria-modal', 'true')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal')
    expect(screen.getByRole('button', { name: 'Maximize VINCE' })).toBeInTheDocument()
  })

  it('minimizes to a bar with a status line, and restores', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    await user.click(screen.getByRole('button', { name: 'Minimize VINCE' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Standing by')
    await user.click(screen.getByRole('button', { name: 'Restore VINCE' }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('welcomes the visitor back on a second open', async () => {
    const user = userEvent.setup()
    await openFromHeader(user)
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'ask VINCE' }))
    expect(within(log()).getByText(/^Welcome back\./)).toBeInTheDocument()
  })

  it('narrates the brief from the minimized bar on vince:brief and reports it', async () => {
    const onBriefing = vi.fn()
    window.addEventListener('vince:briefing', onBriefing)
    render(<Page />)
    act(() => window.dispatchEvent(new Event('vince:brief')))
    expect(screen.getByRole('dialog')).toHaveClass('vince--mini')
    expect(screen.getByRole('button', { name: 'Stop VINCE' })).toBeInTheDocument()
    expect(onBriefing.mock.calls.map((c) => c[0].detail)).toContain(true)
    act(() => window.dispatchEvent(new CustomEvent('vince:stop', { detail: 'brief' })))
    expect(onBriefing.mock.calls.at(-1)[0].detail).toBe(false)
    window.removeEventListener('vince:briefing', onBriefing)
  })
})
