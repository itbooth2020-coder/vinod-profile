import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// useMotion keeps one site-wide setting in module state, read from storage on import: each test
// loads fresh copies after arranging storage and media queries.
const load = async () => {
  vi.resetModules()
  const toggle = await import('./MotionToggle.jsx')
  const motion = await import('../hooks/useMotion.js')
  return { MotionToggle: toggle.default, ...motion }
}
beforeEach(() => document.documentElement.removeAttribute('data-motion'))

describe('MotionToggle and useMotion', () => {
  it('starts unpaused, and pausing sets data-motion, aria-pressed and the saved choice', async () => {
    const { MotionToggle, motionPaused } = await load()
    render(<MotionToggle />)
    const btn = screen.getByRole('button', { name: 'Pause animations' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    await userEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAttribute('title', 'Animations paused')
    expect(document.documentElement.dataset.motion).toBe('paused')
    expect(localStorage.getItem('motion-paused')).toBe('1')
    expect(motionPaused()).toBe(true)
    await userEvent.click(btn)
    expect(document.documentElement).not.toHaveAttribute('data-motion')
    expect(localStorage.getItem('motion-paused')).toBe('0')
  })

  it('follows prefers-reduced-motion when nothing is saved', async () => {
    window.__media['(prefers-reduced-motion: reduce)'] = true
    const { MotionToggle } = await load()
    render(<MotionToggle />)
    expect(screen.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.dataset.motion).toBe('paused')
  })

  it('a saved choice wins over the system preference', async () => {
    window.__media['(prefers-reduced-motion: reduce)'] = true
    localStorage.setItem('motion-paused', '0')
    const { MotionToggle } = await load()
    render(<MotionToggle />)
    expect(screen.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('updates every subscriber when the setting changes elsewhere', async () => {
    const { MotionToggle, setMotionPaused } = await load()
    render(<><MotionToggle /><MotionToggle /></>)
    act(() => setMotionPaused(true))
    for (const b of screen.getAllByRole('button', { name: 'Pause animations' })) expect(b).toHaveAttribute('aria-pressed', 'true')
  })
})
