import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SectionBoundary, { lazyRetry } from './SectionBoundary.jsx'

// React logs caught render errors; keep the output readable.
beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

const state = { broken: true }
function Flaky() {
  if (state.broken) throw new Error('chunk failed')
  return <p>Loaded section</p>
}

describe('SectionBoundary', () => {
  beforeEach(() => {
    state.broken = true
  })

  it('renders its children when they work', () => {
    state.broken = false
    render(<SectionBoundary title="Check role fit"><Flaky /></SectionBoundary>)
    expect(screen.getByText('Loaded section')).toBeInTheDocument()
  })

  it('shows the section heading, a message and Retry in place of a failed section', () => {
    render(<SectionBoundary id="fit" className="lazy-ph lazy-ph--fit" title="Check role fit"><Flaky /></SectionBoundary>)
    const region = screen.getByRole('region', { name: 'Check role fit' })
    expect(region).toHaveAttribute('id', 'fit') // anchors and the header nav still work
    expect(region).toHaveClass('lazy-ph', 'lazy-ph--fit', 'section-error') // keeps the reserved height
    expect(screen.getByRole('heading', { level: 2, name: 'Check role fit' })).toBeInTheDocument()
    expect(screen.getByText("This section couldn't load.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('Retry calls onRetry and renders the section again', async () => {
    const onRetry = vi.fn(() => (state.broken = false))
    render(<SectionBoundary title="Check role fit" onRetry={onRetry}><Flaky /></SectionBoundary>)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Loaded section')).toBeInTheDocument()
  })


  it('supports a level-3 heading in a div, and custom fallbacks', () => {
    const { unmount } = render(<SectionBoundary tag="div" level={3} title="Domain graph"><Flaky /></SectionBoundary>)
    expect(screen.getByRole('heading', { level: 3, name: 'Domain graph' })).toBeInTheDocument()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    unmount()
    render(<SectionBoundary fallback={(retry) => <button onClick={retry}>Try VINCE again</button>}><Flaky /></SectionBoundary>)
    expect(screen.getByRole('button', { name: 'Try VINCE again' })).toBeInTheDocument()
  })
})

describe('lazyRetry', () => {
  it('loads a lazy section, trying the import a second time after a failure', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('dropped')).mockResolvedValue({ default: () => <p>Role fit</p> })
    const Section = lazyRetry(load)
    render(<SectionBoundary title="Check role fit"><Suspense fallback={<p>Loading</p>}><Section /></Suspense></SectionBoundary>)
    expect(await screen.findByText('Role fit', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('after two failures shows Retry, and Retry starts a fresh import', async () => {
    let ok = false
    const load = vi.fn(() => (ok ? Promise.resolve({ default: () => <p>Role fit</p> }) : Promise.reject(new Error('down'))))
    const Section = lazyRetry(load)
    render(<SectionBoundary title="Check role fit" onRetry={Section.reset}><Suspense fallback={<p>Loading</p>}><Section /></Suspense></SectionBoundary>)
    const retry = await screen.findByRole('button', { name: 'Retry' }, { timeout: 3000 })
    expect(load).toHaveBeenCalledTimes(2)
    ok = true
    await userEvent.click(retry)
    await waitFor(() => expect(screen.getByText('Role fit')).toBeInTheDocument())
  })

  it('a Retry that fails too offers a page reload and keeps focus on the button', async () => {
    const Section = lazyRetry(() => Promise.reject(new Error('down')))
    render(<SectionBoundary title="Check role fit" onRetry={Section.reset}><Suspense fallback={<p>Loading</p>}><Section /></Suspense></SectionBoundary>)
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }, { timeout: 3000 }))
    const reload = await screen.findByRole('button', { name: 'Reload page' }, { timeout: 3000 })
    expect(reload).toHaveFocus()
  })
})
