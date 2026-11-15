import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The launcher (Vince.jsx) loads the panel (VoiceAssistant.jsx) on idle or on first use. Here the
// panel is a stand-in that records the events it receives, so the test sees what gets replayed.
const { fakePanel } = vi.hoisted(() => ({
  fakePanel: async () => {
    const { useEffect, useState } = await import('react')
    return {
      default: function FakeAssistant({ onReady }) {
        const [got, setGot] = useState([])
        useEffect(() => {
          const on = (e) => setGot((g) => [...g, e.type + (e.detail ? `:${JSON.stringify(e.detail)}` : '')])
          const types = ['vince:open', 'vince:explain', 'vince:brief']
          types.forEach((t) => window.addEventListener(t, on))
          onReady()
          return () => types.forEach((t) => window.removeEventListener(t, on))
        }, [])
        return <p>Panel received: {got.join(', ') || 'nothing'}</p>
      },
    }
  },
}))
vi.mock('./VoiceAssistant.jsx', fakePanel)
vi.mock('../agent/voiceSafe.js', () => ({ loadVoice: () => Promise.resolve(null) }))

let idle
beforeEach(() => {
  idle = window.requestIdleCallback
  window.requestIdleCallback = () => 0 // the browser never goes idle: loading waits for the visitor
})
afterEach(() => {
  window.requestIdleCallback = idle
})

const fresh = async () => {
  vi.resetModules()
  return (await import('./Vince.jsx')).default
}

describe('Vince launcher', () => {
  it('shows the launcher at once, before the panel has loaded', async () => {
    const Vince = await fresh()
    render(<Vince />)
    const btn = screen.getByRole('button', { name: 'Ask VINCE' })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    expect(btn).toHaveAttribute('data-vince-trigger')
  })

  it('queues events sent before the panel loads and replays them in order', async () => {
    const Vince = await fresh()
    render(<Vince />)
    act(() => {
      window.dispatchEvent(new Event('vince:open'))
      window.dispatchEvent(new CustomEvent('vince:explain', { detail: { type: 'root' } }))
      window.dispatchEvent(new Event('vince:brief'))
    })
    expect(await screen.findByText('Panel received: vince:open, vince:explain:{"type":"root"}, vince:brief')).toBeInTheDocument()
  })

  it('a tap on the launcher loads the panel and opens it', async () => {
    const Vince = await fresh()
    render(<Vince />)
    await userEvent.click(screen.getByRole('button', { name: 'Ask VINCE' }))
    expect(await screen.findByText('Panel received: vince:open')).toBeInTheDocument()
  })

  it('primes speech inside the tap, so the replayed answer may speak', async () => {
    const Vince = await fresh()
    render(<Vince />)
    window.speechSynthesis.speak.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Ask VINCE' }))
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
    expect(window.speechSynthesis.speak.mock.calls[0][0]).toMatchObject({ text: '', volume: 0 })
  })

  it('loads the panel when the browser is idle, without replaying anything', async () => {
    window.requestIdleCallback = (cb) => setTimeout(cb, 1)
    const Vince = await fresh()
    render(<Vince />)
    expect(await screen.findByText('Panel received: nothing')).toBeInTheDocument()
  })

  it('says when the panel could not load, and a tap tries again', async () => {
    vi.doMock('./VoiceAssistant.jsx', () => {
      throw new Error('chunk failed')
    })
    const Vince = await fresh()
    render(<Vince />)
    await userEvent.click(screen.getByRole('button', { name: 'Ask VINCE' }))
    const note = await screen.findByText("VINCE couldn't load. Tap to retry.", {}, { timeout: 4000 })
    expect(note).toHaveAttribute('role', 'status')
    expect(screen.getByRole('button', { name: 'Ask VINCE' })).toHaveAccessibleDescription("VINCE couldn't load. Tap to retry.")

    vi.doMock('./VoiceAssistant.jsx', fakePanel) // the network is back
    await userEvent.click(screen.getByRole('button', { name: 'Ask VINCE' }))
    expect(await screen.findByText('Panel received: vince:open', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.queryByText(/couldn't load/)).not.toBeInTheDocument()
    vi.doUnmock('./VoiceAssistant.jsx')
  })
})
