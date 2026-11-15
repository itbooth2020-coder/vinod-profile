import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { experience } from '../data.js'
import Experience from './Experience.jsx'

const roles = (container) => [...container.querySelectorAll('details')]

describe('Experience', () => {
  it('lists every role, newest first, with company, period and location', () => {
    const { container } = render(<Experience />)
    const region = screen.getByRole('region', { name: 'Experience' })
    expect(within(region).getAllByRole('listitem').filter((li) => li.classList.contains('job'))).toHaveLength(experience.length)
    const summaries = roles(container).map((d) => d.querySelector('summary').textContent)
    experience.forEach((e, i) => {
      expect(summaries[i]).toContain(e.role)
      expect(summaries[i]).toContain(e.company)
      expect(summaries[i]).toContain(e.period)
    })
  })

  it('marks only the current role', () => {
    render(<Experience />)
    expect(screen.getAllByText('current')).toHaveLength(1)
  })

  it('opens the two latest roles and collapses the older ones', () => {
    const { container } = render(<Experience />)
    expect(roles(container).map((d) => d.open)).toEqual(experience.map((_, i) => i < 2))
  })

  it('a collapsed role expands from its summary', async () => {
    const { container } = render(<Experience />)
    const older = roles(container)[2]
    await userEvent.click(older.querySelector('summary'))
    expect(older.open).toBe(true)
  })

  it('prints every role in full, then restores the collapsed ones', () => {
    const { container } = render(<Experience />)
    act(() => window.dispatchEvent(new Event('beforeprint')))
    expect(roles(container).every((d) => d.open)).toBe(true)
    act(() => window.dispatchEvent(new Event('afterprint')))
    expect(roles(container).map((d) => d.open)).toEqual(experience.map((_, i) => i < 2))
  })
})
