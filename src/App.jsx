import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ScrollProgress from './components/ScrollProgress.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Brief from './components/Brief.jsx'
import ProfileCard from './components/ProfileCard.jsx'
import Impact from './components/Impact.jsx'
import Leadership from './components/Leadership.jsx'
import Experience from './components/Experience.jsx'
import Projects from './components/Projects.jsx'
import Skills from './components/Skills.jsx'
import Credentials from './components/Credentials.jsx'
import Contact from './components/Contact.jsx'
import Blogs from './components/Blogs.jsx'
import Footer from './components/Footer.jsx'
import Vince from './components/Vince.jsx'
import { liveAgent } from './agent/askAgent.js'

// Below-the-fold, interactive sections load as separate chunks after first paint (PERF-FE-002).
// Each placeholder reserves the section's height (styles.css .lazy-ph), so nothing shifts when it
// arrives, and keeps its anchor id for the header nav and deep links. The build-time prerender and
// hydration show the placeholders; the sections load once the app has mounted.
const RoleFit = lazy(() => import('./components/RoleFit.jsx'))
const PromptConsole = lazy(() => import('./components/PromptConsole.jsx'))
const DomainGraph = lazy(() => import('./components/DomainGraph.jsx'))

// 30-second brief: <html data-mode="brief"> hides everything but the header and the brief (styles.css).
// Shareable via ?brief=1 (index.html applies it before first paint); not persisted.
const briefInUrl = () => new URLSearchParams(window.location.search).get('brief') === '1'

const fitPlaceholder = <div id="fit" className="lazy-ph lazy-ph--fit" aria-busy="true" />
const consolePlaceholder = <div id="console" className="card chat lazy-ph" aria-busy="true" />
const graphPlaceholder = <div className="card lazy-ph lazy-ph--graph" aria-busy="true" />

export default function App() {
  // The prerendered HTML (vite.config.js) is the full profile and hydration must render the same, so
  // ?brief=1 and the lazy sections apply right after it, before the browser paints the hydrated page.
  const [brief, setBrief] = useState(false)
  const [mounted, setMounted] = useState(false)
  const toggleRef = useRef(null)
  const headingRef = useRef(null)
  const moveFocus = useRef(false) // only after the visitor toggles, not on load
  const keepFocus = useRef(false) // set by an outside-click close, so focus stays where the visitor clicked
  const pendingHash = useRef('')
  const briefRef = useRef(brief)
  briefRef.current = brief

  const showBrief = (on, opts) => {
    moveFocus.current = true
    keepFocus.current = !!opts?.keepFocus
    setBrief(on)
  }

  useLayoutEffect(() => {
    // Show the rest of the page (hidden until now: index.html data-app, styles.css). A deep link to a
    // section couldn't scroll while it was hidden, so go there now unless the visitor has scrolled.
    delete document.documentElement.dataset.app
    if (briefInUrl()) setBrief(true)
    else if (window.scrollY === 0 && /^#(?!case-)./.test(window.location.hash)) {
      try {
        document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' })
      } catch {
        /* malformed hash: stay at the top */
      }
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return // until the URL has been read: keep index.html's data-mode and ?brief=1
    const root = document.documentElement
    if (brief) root.dataset.mode = 'brief'
    else delete root.dataset.mode

    const url = new URL(window.location.href)
    if (brief) url.searchParams.set('brief', '1')
    else url.searchParams.delete('brief')
    if (url.href !== window.location.href) history.replaceState(history.state, '', url)

    if (pendingHash.current) {
      // Left brief mode by following an in-page link: finish that navigation.
      const id = pendingHash.current
      pendingHash.current = ''
      if (window.location.hash === `#${id}`) {
        document.getElementById(id)?.scrollIntoView()
        window.dispatchEvent(new HashChangeEvent('hashchange')) // let the section move focus (RoleFit)
      }
      else window.location.hash = id
      return
    }
    if (!moveFocus.current) return
    moveFocus.current = false
    const keep = keepFocus.current
    keepFocus.current = false
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (brief) headingRef.current?.focus()
    else if (!keep) toggleRef.current?.focus()
  }, [brief, mounted])

  useEffect(() => {
    // In-page links (header nav, skip link) to sections hidden by brief mode leave it first.
    const onClick = (e) => {
      if (!briefRef.current || e.defaultPrevented || e.button !== 0) return
      const link = e.target instanceof Element && e.target.closest('a[href^="#"]')
      const id = link?.getAttribute('href').slice(1)
      const el = id && document.getElementById(id)
      if (!el || el.getClientRects().length) return
      e.preventDefault()
      pendingHash.current = id
      setBrief(false)
    }
    // VINCE's guided tour narrates the full page.
    const onExit = () => setBrief(false)
    document.addEventListener('click', onClick)
    window.addEventListener('brief:exit', onExit)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('brief:exit', onExit)
    }
  }, [])

  return (
    <>
      <ScrollProgress />
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap">
        <Header />
        <main id="main">
          <Hero brief={brief} onToggleBrief={() => showBrief(!brief)} toggleRef={toggleRef} />
          {brief && <Brief headingRef={headingRef} onClose={(opts) => showBrief(false, opts)} />}
          {/* Keep Header.jsx nav and VINCE's tour (agent/vince.js tourSteps) in this order. */}
          <Impact />
          <Leadership />
          <Projects />
          <Experience />
          {mounted ? (
            <Suspense fallback={fitPlaceholder}>
              <RoleFit />
            </Suspense>
          ) : fitPlaceholder}
          <div className="layout">
            {/* VINCE's text console: the same assistant and conversation as the VINCE panel (CHAT-001). */}
            <h2 className="sr-only">{liveAgent ? 'Ask VINCE, the AI assistant, about the profile' : 'Ask VINCE about the profile'}</h2>
            {mounted ? (
              <Suspense fallback={consolePlaceholder}>
                <PromptConsole />
              </Suspense>
            ) : consolePlaceholder}
            <div className="side">
              <ProfileCard />
              {mounted ? (
                <Suspense fallback={graphPlaceholder}>
                  <DomainGraph />
                </Suspense>
              ) : graphPlaceholder}
            </div>
          </div>
          <Skills />
          <Credentials />
          <Blogs />
          <Contact />
        </main>
        <Footer />
      </div>
      <Vince />
    </>
  )
}
