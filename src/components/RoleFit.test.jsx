import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_CHARS, SAMPLE_JD } from '../agent/roleFit.js'
import RoleFit from './RoleFit.jsx'

const textbox = () => screen.getByRole('textbox', { name: 'Paste a job description' })
const announcement = () => screen.getAllByRole('status').find((s) => s.classList.contains('sr-only'))

describe('RoleFit', () => {
  it('has a labelled text box that says nothing is sent', () => {
    render(<RoleFit />)
    expect(screen.getByRole('heading', { name: 'Check role fit', level: 2 })).toBeInTheDocument()
    expect(textbox()).toHaveAccessibleDescription(/Runs in your browser\. Nothing is sent or stored\./)
    expect(textbox()).toHaveAttribute('maxLength', String(MAX_CHARS))
  })

  it('"Try a sample" fills the box, shows matched evidence and announces the summary', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    expect(textbox()).toHaveValue(SAMPLE_JD)
    expect(announcement()).toHaveTextContent(/requirements matched with evidence · \d+ related · \d+ not evident in the profile/)
    const matched = screen.getByRole('heading', { name: /^Matched with evidence \(\d+\)$/ })
    expect(matched).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Leadership evidence' })).toBeInTheDocument()
    expect(screen.getByText('Kotlin', { selector: '.fit__term' })).toBeInTheDocument()
  })

  it('shows no score or percentage (evidence lines quote the resume and may contain %)', async () => {
    const user = userEvent.setup()
    const { container } = render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    const verdicts = [
      container.querySelector('.fit__status'),
      container.querySelector('.fit__cov'),
      announcement(),
      ...screen.getAllByRole('heading', { level: 3 }),
    ]
    for (const el of verdicts) expect(el).not.toHaveTextContent(/\d+\s*%|score|\/\s*100|out of|rating|verdict/i)
    // The coverage bar is decorative; its legend gives counts only.
    expect(container.querySelector('.fit__bar')).toHaveAttribute('aria-hidden', 'true')
    expect(within(container.querySelector('.fit__legend')).getAllByRole('listitem').map((li) => li.textContent.trim())).toEqual([
      expect.stringMatching(/^Matched: \d+$/),
      expect.stringMatching(/^Related: \d+$/),
      expect.stringMatching(/^Not evident: \d+$/),
    ])
  })

  it('shows no availability line while availability is hidden', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    expect(screen.queryByText(/^Availability:/)).not.toBeInTheDocument()
  })

  it('asks for more text when the paste is too short', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.type(textbox(), 'Kotlin and Swift')
    await user.click(screen.getByRole('button', { name: 'Check fit' }))
    expect(announcement()).toHaveTextContent('Paste a bit more of the job description (at least 20 words) to check fit.')
    expect(screen.queryByRole('heading', { name: /Matched with evidence/ })).not.toBeInTheDocument()
  })

  it('updates the results as the visitor types (debounced), without announcing each change', async () => {
    render(<RoleFit />)
    fireEvent.change(textbox(), { target: { value: SAMPLE_JD } })
    await waitFor(() => expect(screen.getByRole('heading', { name: /^Matched with evidence/ })).toBeInTheDocument())
    expect(announcement()).toBeEmptyDOMElement()
  })

  it('Clear empties the box, removes the results and focuses the box', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(textbox()).toHaveValue('')
    expect(textbox()).toHaveFocus()
    expect(screen.queryByRole('heading', { name: /Matched with evidence/ })).not.toBeInTheDocument()
    expect(announcement()).toBeEmptyDOMElement()
  })

  it('counts characters and says when the limit is reached', () => {
    render(<RoleFit />)
    fireEvent.change(textbox(), { target: { value: 'Kotlin' } })
    expect(screen.getByText('6 / 20,000 characters')).toBeInTheDocument()
    fireEvent.change(textbox(), { target: { value: 'x'.repeat(MAX_CHARS) } })
    expect(screen.getByText('Limit reached: only the first 20,000 characters are checked.')).toBeInTheDocument()
  })

  it('copies a plain-text summary to the clipboard', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    await user.click(screen.getByRole('button', { name: 'Copy summary' }))
    const copied = await navigator.clipboard.readText()
    expect(copied).toMatch(/^Role fit notes for Vinod Pyarelal Yadav/)
    expect(copied).not.toMatch(/Availability/)
    expect(screen.getByText('Copied summary to the clipboard.')).toBeInTheDocument()
  })

  it('says how to copy manually when the clipboard is unavailable', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    await user.click(screen.getByRole('button', { name: 'Copy summary' }))
    expect(screen.getByText('Copy failed. Select the results and copy them manually.')).toBeInTheDocument()
  })

  it('moves focus to its heading when the visitor arrives via #fit', () => {
    render(<RoleFit />)
    act(() => {
      history.replaceState(null, '', '/#fit')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('heading', { name: 'Check role fit' })).toHaveFocus()
  })

  it('lists evidence lines with where they come from', async () => {
    const user = userEvent.setup()
    render(<RoleFit />)
    await user.click(screen.getByRole('button', { name: 'Try a sample' }))
    const item = screen.getByText('Kotlin', { selector: '.fit__term' }).closest('details')
    await user.click(within(item).getByText('Kotlin'))
    expect(item.open).toBe(true)
    expect(within(item).getAllByRole('listitem').length).toBeGreaterThan(0)
  })
})
