import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { namedBanks } from '../test/bankMentions.js'
import Projects from './Projects.jsx'

// The new current project (15 Nov 2026 resume sync, t15): its card, case study and #case-bank-appsec link.
const NAME = 'Global Bank – Application Security & Vulnerability Remediation'
const openDialog = () => screen.findByRole('dialog', {}, { timeout: 3000 })

describe('Projects: the global bank program', () => {
  it('is the first project card, tagged Banking · Application Security, without naming the client', () => {
    render(<Projects />)
    const region = screen.getByRole('region', { name: 'Key projects' })
    const first = within(region).getAllByRole('heading', { level: 3 })[0]
    expect(first).toHaveTextContent(NAME)
    expect(region).toHaveTextContent('Banking · Application Security')
    expect(namedBanks(region.textContent)).toEqual([])
  })

  it('its case study button sets #case-bank-appsec, shows role, approach and no outcome figures, and returns focus on Close', async () => {
    const user = userEvent.setup()
    render(<Projects />)
    const opener = screen.getByRole('button', { name: new RegExp(`Read case study:\\s*${NAME}`) })
    await user.click(opener)
    const dialog = await openDialog()
    expect(window.location.hash).toBe('#case-bank-appsec')
    expect(dialog).toHaveAccessibleName(NAME)
    expect(dialog).toHaveTextContent('Client: A global bank')
    expect(within(dialog).getByRole('heading', { name: 'My role' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent(/Serves as Technical Program Manager for a global bank's/)
    expect(dialog).toHaveTextContent(/Six-phase model/)
    expect(dialog).toHaveTextContent(/OWASP MASVS/)
    // outcomes and metrics are empty in data.js: no Outcome or Impact headings, no invented figures.
    expect(within(dialog).queryByRole('heading', { name: 'Outcome' })).toBeNull()
    expect(within(dialog).queryByRole('heading', { name: 'Impact' })).toBeNull()
    expect(namedBanks(dialog.textContent)).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: 'Close case study' }))
    expect(dialog).not.toHaveAttribute('open')
    expect(window.location.hash).toBe('')
    expect(opener).toHaveFocus()
  })

  it('opens when the hash changes to #case-bank-appsec (e.g. a link in one of VINCE\'s answers)', async () => {
    render(<Projects />)
    act(() => {
      history.replaceState(null, '', '/#case-bank-appsec')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    const dialog = await openDialog()
    await waitFor(() => expect(dialog).toHaveAttribute('open'))
    expect(dialog).toHaveAccessibleName(NAME)
  })
})
