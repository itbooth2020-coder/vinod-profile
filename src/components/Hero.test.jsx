import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import Hero from './Hero.jsx'

function HeroWithSwitch() {
  const [brief, setBrief] = useState(false)
  return <Hero brief={brief} onToggleBrief={() => setBrief((b) => !b)} toggleRef={{ current: null }} />
}

const glance = () => {
  const heading = screen.getByRole('heading', { name: 'Profile details' })
  return heading.parentElement
}

describe('Hero', () => {
  it('shows the name, headline and pitch', () => {
    render(<HeroWithSwitch />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Vinod Pyarelal Yadav')
    expect(screen.getByText(/^Engineering Manager \| Mobile/)).toBeInTheDocument()
    expect(screen.getByText(/^Engineering Manager leading a 35\+ engineer/)).toBeInTheDocument()
  })

  it('"Read more" expands the pitch', async () => {
    render(<HeroWithSwitch />)
    const more = screen.getByRole('button', { name: 'Read more' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveAttribute('aria-controls', 'hero-pitch')
    await userEvent.click(more)
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('has an email action and social links that open in a new tab', () => {
    render(<HeroWithSwitch />)
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:yadav.vinod579@gmail.com')
    const social = within(screen.getByRole('list', { name: 'Social profiles' })).getAllByRole('link')
    expect(social.map((a) => a.textContent)).toEqual(['LinkedIn (opens in a new tab)', 'GitHub (opens in a new tab)', 'Facebook (opens in a new tab)', 'X (Twitter, opens in a new tab)'])
    for (const a of social) {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('shows no availability, age or date of birth', () => {
    const { container } = render(<HeroWithSwitch />)
    expect(container).not.toHaveTextContent(/open to new roles|notice|relocation|years old|born|date of birth|\bage\b/i)
  })
})

describe('ProfileCard', () => {
  it('lists role, company, experience, team scale and location', () => {
    render(<HeroWithSwitch />)
    const terms = within(glance()).getAllByRole('term').map((t) => t.textContent)
    expect(terms).toEqual(['role', 'company', 'experience', 'team scale', 'location'])
    const values = within(glance()).getAllByRole('definition').map((d) => d.textContent)
    expect(values).toEqual(['Custom Software Engineering Manager', 'Accenture · since Jun 2024', '14+ years', '35+ engineers', 'Bengaluru, India'])
  })

  it('the 30-second brief switch toggles aria-checked', async () => {
    render(<HeroWithSwitch />)
    const sw = screen.getByRole('switch', { name: '30-second brief' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
  })

  it('"More" opens the profile dialog, and Close closes it', async () => {
    const user = userEvent.setup()
    render(<HeroWithSwitch />)
    const more = screen.getByRole('button', { name: /^More\s*about Vinod Pyarelal$/ })
    expect(more).toHaveAttribute('aria-haspopup', 'dialog')
    await user.click(more)
    const dialog = screen.getByRole('dialog', { name: 'Vinod Pyarelal Yadav' })
    expect(dialog).toHaveAttribute('open')
    expect(within(dialog).getByRole('img', { name: 'Formal portrait of Vinod Pyarelal Yadav' })).toBeInTheDocument()
    const details = within(dialog).getAllByRole('term').map((t) => t.textContent)
    expect(details).toEqual(['Nationality', 'Location', 'Current role', 'Experience', 'Education', 'Languages'])
    expect(dialog).not.toHaveTextContent(/date of birth|\bage\b|born|years old/i)
    expect(within(dialog).getByRole('link', { name: /^LinkedIn ↗\s*\(opens in a new tab\)$/ })).toHaveAttribute('target', '_blank')

    await user.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
    expect(dialog).not.toHaveAttribute('open')
    // The dialog's content (and its large photo) unmounts when it closes.
    expect(screen.queryByRole('img', { name: /Formal portrait/ })).not.toBeInTheDocument()
  })

  it('a click on the dialog backdrop closes it', async () => {
    const user = userEvent.setup()
    render(<HeroWithSwitch />)
    await user.click(screen.getByRole('button', { name: /^More\s*about/ }))
    const dialog = screen.getByRole('dialog')
    await user.click(dialog) // the <dialog> itself, outside its content
    expect(dialog).not.toHaveAttribute('open')
  })
})
