import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { projects } from '../data.js'
import Projects from './Projects.jsx'

const openDialog = () => screen.findByRole('dialog', {}, { timeout: 3000 })

describe('Projects', () => {
  it('lists every project with its tag, and the other projects', () => {
    render(<Projects />)
    const region = screen.getByRole('region', { name: 'Key projects' })
    expect(within(region).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(projects.map((p) => p.name))
    expect(region).toHaveTextContent('Also:')
  })

  it('offers a case study button named after each project that has one', () => {
    render(<Projects />)
    const buttons = screen.getAllByRole('button', { name: /^Read case study:/ })
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) expect(b).toHaveAttribute('aria-haspopup', 'dialog')
    expect(screen.getByRole('button', { name: /Read case study:\s*Darwin Portal – Syngenta/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Read case study:\s*Global Bank – Application Security & Vulnerability Remediation/ })).toBeInTheDocument()
  })

  it('opens the current bank program from its #case-bank-appsec link, with its client and approach', async () => {
    history.replaceState(null, '', '/#case-bank-appsec')
    try {
      render(<Projects />)
      const dialog = await openDialog()
      expect(dialog).toHaveAccessibleName('Global Bank – Application Security & Vulnerability Remediation')
      expect(dialog).toHaveTextContent(/Client: A global bank/)
      expect(dialog).toHaveTextContent(/approximately 3,000 Android, iOS, and web applications/)
      expect(within(dialog).getByRole('heading', { name: 'Approach' })).toBeInTheDocument()
      expect(dialog).toHaveTextContent(/OWASP Top 10/)
    } finally {
      history.replaceState(null, '', '/')
    }
  })

  it('opens the case study in a dialog, sets a shareable #case- link, and returns focus on Close', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const opener = screen.getByRole('button', { name: /Read case study:\s*Darwin Portal/ })
    await user.click(opener)
    const dialog = await openDialog()
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAccessibleName('Darwin Portal – Syngenta')
    expect(window.location.hash).toBe('#case-darwin')
    expect(within(dialog).getByRole('heading', { name: 'Approach' })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Ask VINCE about Darwin Portal – Syngenta' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close case study' }))
    expect(dialog).not.toHaveAttribute('open')
    expect(window.location.hash).toBe('')
    expect(opener).toHaveFocus()
  })

  it('opens the case study named in a #case- deep link on load', async () => {
    history.replaceState(null, '', '/#case-presto')
    render(<Projects />)
    const dialog = await openDialog()
    expect(dialog).toHaveAccessibleName('PRESTO – Transit Payment System')
    expect(dialog).toHaveTextContent('Client: Metrolinx')
  })

  it('opens a case study when the hash changes to its link, and closes it on another hash', async () => {
    render(<Projects />)
    act(() => {
      history.replaceState(null, '', '/#case-darwin')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    const dialog = await openDialog()
    expect(dialog).toHaveAttribute('open')
    act(() => {
      history.replaceState(null, '', '/#fit')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
    expect(window.location.hash).toBe('#fit') // the visitor's navigation is kept
  })

  it('ignores an unknown #case- link', async () => {
    history.replaceState(null, '', '/#case-nope')
    render(<Projects />)
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks VINCE to explain the project and shows his explanation as a caption', async () => {
    const onExplain = vi.fn()
    window.addEventListener('vince:explain', onExplain)
    const user = userEvent.setup()
    render(<Projects />)
    await user.click(screen.getByRole('button', { name: /Read case study:\s*Darwin Portal/ }))
    const dialog = await openDialog()
    await user.click(within(dialog).getByRole('button', { name: /^Ask VINCE about/ }))
    expect(onExplain).toHaveBeenCalledTimes(1)
    expect(onExplain.mock.calls[0][0].detail).toMatchObject({ type: 'project' })
    expect(within(dialog).getByRole('status')).toHaveTextContent(/^VINCE:.*Darwin/)
    window.removeEventListener('vince:explain', onExplain)
  })
})
