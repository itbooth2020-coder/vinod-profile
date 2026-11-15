import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Brief from './Brief.jsx'

const setup = () => {
  const onClose = vi.fn()
  const headingRef = createRef()
  render(<Brief headingRef={headingRef} onClose={onClose} />)
  return { onClose, headingRef }
}

describe('Brief', () => {
  it('is a labelled region with a focusable heading', () => {
    const { headingRef } = setup()
    const region = screen.getByRole('region', { name: /^30-second brief:\s*Vinod Pyarelal Yadav$/ })
    expect(headingRef.current).toBe(within(region).getByRole('heading', { level: 1 }))
    expect(headingRef.current).toHaveAttribute('tabindex', '-1')
  })

  it('shows proof points with screen-reader wording, top projects and domains, and no availability', () => {
    setup()
    expect(screen.getByText('3 weeks to 5 days')).toHaveClass('sr-only')
    expect(screen.getByRole('heading', { name: 'Top projects' })).toBeInTheDocument()
    expect(screen.getByText('Global Bank – Application Security & Vulnerability Remediation')).toBeInTheDocument()
    expect(screen.getByText('Darwin Portal – Syngenta')).toBeInTheDocument()
    expect(screen.getByRole('region')).not.toHaveTextContent(/open to new roles|notice|relocat/i)
  })

  describe('exits', () => {
    it('the × button closes it', async () => {
      const { onClose } = setup()
      await userEvent.click(screen.getByRole('button', { name: 'Close the 30-second brief' }))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('both "Back to full profile" buttons close it', async () => {
      const { onClose } = setup()
      const backs = screen.getAllByRole('button', { name: /Back to full profile/ })
      expect(backs).toHaveLength(2)
      for (const b of backs) await userEvent.click(b)
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('Escape closes it', async () => {
      const { onClose } = setup()
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('Escape is left to an open dialog', async () => {
      const { onClose } = setup()
      const d = document.createElement('dialog')
      d.setAttribute('open', '')
      document.body.appendChild(d)
      await userEvent.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()
      d.remove()
    })

    it('Escape inside VINCE is left to VINCE', () => {
      const { onClose } = setup()
      const panel = document.createElement('section')
      panel.className = 'vince'
      panel.tabIndex = -1
      document.body.appendChild(panel)
      fireEvent.keyDown(panel, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
      panel.remove()
    })

    describe('a click on blank space outside the card', () => {
      beforeEach(() => {
        Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1200 })
        Object.defineProperty(document.documentElement, 'clientHeight', { configurable: true, value: 800 })
      })
      afterEach(() => {
        delete document.documentElement.clientWidth
        delete document.documentElement.clientHeight
      })
      const press = (target, from, to = from) => {
        fireEvent.pointerDown(target, { button: 0, isPrimary: true, clientX: from[0], clientY: from[1] })
        fireEvent.pointerUp(target, { button: 0, isPrimary: true, clientX: to[0], clientY: to[1] })
      }

      it('closes it and keeps focus where the visitor clicked', () => {
        const { onClose } = setup()
        press(document.body, [20, 20])
        expect(onClose).toHaveBeenCalledWith({ keepFocus: true })
        // The click that follows the press is swallowed once, so it can't land on the full page.
        const after = vi.fn()
        document.body.addEventListener('click', after)
        fireEvent.click(document.body)
        expect(after).not.toHaveBeenCalled()
        fireEvent.click(document.body)
        expect(after).toHaveBeenCalledTimes(1)
        document.body.removeEventListener('click', after)
      })

      it('not a drag, a press inside the card, or a press on the scrollbar', () => {
        const { onClose } = setup()
        press(document.body, [20, 20], [80, 20])
        press(screen.getByRole('region'), [20, 20])
        press(document.body, [1200, 20])
        expect(onClose).not.toHaveBeenCalled()
        fireEvent.click(document.body)
      })
    })
  })

  describe('Ask VINCE', () => {
    it('asks VINCE to narrate the brief', async () => {
      const onBrief = vi.fn()
      window.addEventListener('vince:brief', onBrief)
      setup()
      const ask = screen.getByRole('button', { name: 'Ask VINCE to explain this brief' })
      expect(ask).toHaveAttribute('data-vince-trigger')
      await userEvent.click(ask)
      expect(onBrief).toHaveBeenCalledTimes(1)
      window.removeEventListener('vince:brief', onBrief)
    })

    it('while VINCE narrates, offers Stop, and Escape stops him before closing', async () => {
      const onStop = vi.fn()
      window.addEventListener('vince:stop', onStop)
      const { onClose } = setup()
      act(() => window.dispatchEvent(new CustomEvent('vince:briefing', { detail: true })))
      const stop = screen.getByRole('button', { name: 'Stop VINCE' })
      await userEvent.keyboard('{Escape}')
      expect(onStop).toHaveBeenCalledTimes(1)
      expect(onClose).not.toHaveBeenCalled()
      await userEvent.click(stop)
      expect(onStop).toHaveBeenCalledTimes(2)
      window.removeEventListener('vince:stop', onStop)
    })

    it('leaving the brief ends a narration in progress', () => {
      const onStop = vi.fn()
      window.addEventListener('vince:stop', onStop)
      const onClose = vi.fn()
      const { unmount } = render(<Brief headingRef={createRef()} onClose={onClose} />)
      act(() => window.dispatchEvent(new CustomEvent('vince:briefing', { detail: true })))
      unmount()
      expect(onStop).toHaveBeenCalledTimes(1)
      expect(onStop.mock.calls[0][0].detail).toBe('brief')
      window.removeEventListener('vince:stop', onStop)
    })
  })

  it('has email, role fit and LinkedIn actions', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Email' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: 'Check role fit' })).toHaveAttribute('href', '#fit')
    expect(screen.getByRole('link', { name: /^LinkedIn\s*\(opens in a new tab\)$/ })).toHaveAttribute('target', '_blank')
  })
})
