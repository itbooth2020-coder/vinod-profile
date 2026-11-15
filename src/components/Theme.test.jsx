import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeToggle from './ThemeToggle.jsx'
import ThemePicker from './ThemePicker.jsx'

const root = document.documentElement
const reset = () => {
  for (const a of ['data-theme', 'data-palette', 'data-font', 'data-motion', 'style']) root.removeAttribute(a)
  document.querySelectorAll('link[id^="font-"]').forEach((l) => l.remove())
}
beforeEach(reset)
afterEach(reset)

// WCAG contrast ratio of two #rrggbb colours.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('ThemeToggle', () => {
  it('starts dark by default and switches to light, saving the choice', async () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: 'Theme: dark' })
    expect(btn).toHaveTextContent('Theme')
    expect(btn).toHaveAttribute('title', 'Switch to the light theme')
    expect(root.dataset.theme).toBe('dark')
    await userEvent.click(btn)
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeInTheDocument()
    expect(root.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('follows the system preference when nothing is saved', () => {
    window.__media['(prefers-color-scheme: light)'] = true
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeInTheDocument()
  })

  it('restores a saved theme over the system preference', () => {
    window.__media['(prefers-color-scheme: light)'] = true
    localStorage.setItem('theme', 'dark')
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument()
  })

  it('keeps working when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Theme: dark' }))
    expect(root.dataset.theme).toBe('light')
  })
})

describe('ThemePicker', () => {
  const open = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Customize' }))
    return screen.getByRole('region', { name: 'Theme options' })
  }

  it('opens and closes the panel from its button', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    const btn = screen.getByRole('button', { name: 'Customize' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveAttribute('aria-controls', 'theme-panel')
    const panel = await open(user)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(within(panel).getByRole('radio', { name: /Console/ })).toHaveFocus() // the checked option
    await user.click(btn)
    expect(screen.queryByRole('region', { name: 'Theme options' })).not.toBeInTheDocument()
  })

  // UI-012: below 1100px the button is only a dot; the tooltip names it, the accessible name stays "Customize".
  it('has a tooltip and keeps "Customize" as its name', () => {
    render(<ThemePicker />)
    const btn = screen.getByRole('button', { name: 'Customize' })
    expect(btn).toHaveAttribute('title', 'Customize colours and font')
    expect(btn).toHaveAccessibleName('Customize')
  })

  it('Escape closes the panel and returns focus to the button', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    await open(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Theme options' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Customize' })).toHaveFocus()
  })

  it('a press outside closes the panel', async () => {
    const user = userEvent.setup()
    render(<><p>Elsewhere</p><ThemePicker /></>)
    await open(user)
    fireEvent.pointerDown(screen.getByText('Elsewhere'))
    expect(screen.queryByRole('region', { name: 'Theme options' })).not.toBeInTheDocument()
  })

  it('applies a palette and a font, and saves them', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    const panel = await open(user)
    await user.click(within(panel).getByRole('radio', { name: /Ocean Blue/ }))
    await user.click(within(panel).getByRole('radio', { name: 'IBM Plex Sans' }))
    expect(root.dataset.palette).toBe('blue')
    expect(root.dataset.font).toBe('plex')
    expect(JSON.parse(localStorage.getItem('site-theme'))).toMatchObject({ palette: 'blue', font: 'plex' })
    // Google Fonts only for a picked web font, once.
    expect(document.querySelectorAll('link#font-plex')).toHaveLength(1)
    expect(document.getElementById('font-plex').href).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=IBM\+Plex\+Sans/)
  })

  it('loads no web font for the default or system font', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    const panel = await open(user)
    await user.click(within(panel).getByRole('radio', { name: 'System UI' }))
    expect(document.querySelectorAll('link[id^="font-"]')).toHaveLength(0)
  })

  it.each(['#ffff00', '#000080', '#777777', '#767676', '#8b8cff', '#3dd6c6', '#c8644c', '#ff0000', '#00ff00', '#0000ff', '#ffffff', '#010101'])(
    'a custom accent %s gets the black or white ink with more contrast (at least 4.5:1)',
    async (accent) => {
      const user = userEvent.setup()
      const { container } = render(<ThemePicker />)
      await open(user)
      fireEvent.change(container.querySelectorAll('input[type="color"]')[0], { target: { value: accent } })
      expect(root.style.getPropertyValue('--accent')).toBe(accent)
      const ink = root.style.getPropertyValue('--accent-ink')
      expect(['#000000', '#ffffff']).toContain(ink)
      const other = ink === '#000000' ? '#ffffff' : '#000000'
      expect(contrast(accent, ink)).toBeGreaterThanOrEqual(contrast(accent, other))
      expect(contrast(accent, ink)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('picking a palette clears custom colours; "Reset to palette colors" too', async () => {
    const user = userEvent.setup()
    const { container } = render(<ThemePicker />)
    const panel = await open(user)
    const reset = within(panel).getByRole('button', { name: 'Reset to palette colors' })
    expect(reset).toBeDisabled()
    fireEvent.change(container.querySelectorAll('input[type="color"]')[1], { target: { value: '#123456' } })
    expect(root.style.getPropertyValue('--accent2')).toBe('#123456')
    expect(reset).toBeEnabled()
    await user.click(reset)
    expect(root.style.getPropertyValue('--accent2')).toBe('')
    fireEvent.change(container.querySelectorAll('input[type="color"]')[0], { target: { value: '#123456' } })
    await user.click(within(panel).getByRole('radio', { name: /Graphite/ }))
    expect(root.style.getPropertyValue('--accent')).toBe('')
    expect(root.style.getPropertyValue('--accent-ink')).toBe('')
  })

  it('"Reset all" restores the defaults', async () => {
    const user = userEvent.setup()
    localStorage.setItem('site-theme', JSON.stringify({ palette: 'noir', font: 'serif' }))
    render(<ThemePicker />)
    expect(root.dataset.palette).toBe('noir')
    const panel = await open(user)
    await user.click(within(panel).getByRole('button', { name: 'Reset all' }))
    expect(root.dataset.palette).toBe('console')
    expect(root.dataset.font).toBe('inter')
  })

  it('survives a corrupt saved theme', () => {
    localStorage.setItem('site-theme', '{not json')
    render(<ThemePicker />)
    expect(root.dataset.palette).toBe('console')
  })

  it('copies the choice to the clipboard', async () => {
    const user = userEvent.setup()
    render(<ThemePicker />)
    const panel = await open(user)
    await user.click(within(panel).getByRole('button', { name: 'Copy my choice' }))
    expect(await navigator.clipboard.readText()).toMatch(/^palette: console, font: inter, mode: /)
    expect(within(panel).getByRole('status')).toHaveTextContent('Copied. Paste it to finalize this theme.')
  })
})
