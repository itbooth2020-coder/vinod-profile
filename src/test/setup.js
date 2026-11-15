// Vitest setup (vitest.config.js): jest-dom matchers, cleanup, and stand-ins for the browser APIs
// jsdom doesn't have. Every stub is deterministic and makes no network request.
// Server tests (server/*.test.js) run in the node environment, where only the env stub applies.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// The static site's setting: VINCE answers from the offline resume search, never /api (askAgent.js).
// Tests that need the live path stub it to 'true' and reload the module.
vi.stubEnv('VITE_LIVE_AGENT', 'false')

const browser = typeof window !== 'undefined'

// IntersectionObserver / ResizeObserver: record what is observed; a test can call trigger(entry).
export class FakeObserver {
  static instances = []
  constructor(callback) {
    this.callback = callback
    this.targets = []
    FakeObserver.instances.push(this)
  }
  observe(el) {
    this.targets.push(el)
  }
  unobserve(el) {
    this.targets = this.targets.filter((t) => t !== el)
  }
  disconnect() {
    this.targets = []
  }
  takeRecords() {
    return []
  }
  trigger(entry) {
    this.callback(this.targets.map((target) => ({ target, ...entry })), this)
  }
}

if (browser) {
  // matchMedia: nothing matches unless a test sets window.__media[query] = true.
  window.__media = {}
  window.matchMedia = (query) => ({
    get matches() {
      return Boolean(window.__media[query])
    },
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })

  window.IntersectionObserver = class extends FakeObserver {}
  window.ResizeObserver = class extends FakeObserver {}

  // Speech synthesis: silent.
  window.SpeechSynthesisUtterance = class {
    constructor(text = '') {
      this.text = text
    }
  }
  window.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause() {},
    resume() {},
    getVoices: () => [],
    addEventListener() {},
    removeEventListener() {},
    speaking: false,
    pending: false,
  }

  // <dialog>: showModal()/close() set [open] and fire 'close', like browsers.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }

  // Canvas: a 2D context that accepts every call and remembers assigned properties (ArcOrb, Chart).
  HTMLCanvasElement.prototype.getContext = function getContext() {
    const canvas = this
    const ctx = new Proxy(
      {},
      {
        get(target, prop) {
          if (prop in target) return target[prop]
          if (prop === 'canvas') return canvas
          if (prop === 'measureText') return () => ({ width: 10 })
          return () => ctx
        },
        set(target, prop, value) {
          target[prop] = value
          return true
        },
      },
    )
    return ctx
  }

  // Layout and scrolling, which jsdom doesn't do.
  Element.prototype.scrollIntoView = function scrollIntoView() {}
  window.scrollTo = () => {}
  window.scrollBy = () => {}

  // Idle callbacks (Vince.jsx): run on a short timer, so fake timers can drive them.
  window.requestIdleCallback = (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1)
  window.cancelIdleCallback = (id) => clearTimeout(id)
}

// No test may reach the network. A test that wants fetch gives this mock its own responses.
beforeEach(() => {
  if (!browser) return
  globalThis.fetch = vi.fn(() => Promise.reject(new TypeError('Network disabled in tests')))
})

afterEach(() => {
  if (!browser) return
  cleanup()
  window.__media = {}
  FakeObserver.instances = []
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.removeAttribute('data-mode')
  if (window.location.hash || window.location.search) history.replaceState(null, '', '/')
})
