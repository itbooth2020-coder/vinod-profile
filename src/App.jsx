import { useEffect, useRef, useState } from 'react'
import ScrollProgress from './components/ScrollProgress.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Brief from './components/Brief.jsx'
import PromptConsole from './components/PromptConsole.jsx'
import ProfileCard from './components/ProfileCard.jsx'
import DomainGraph from './components/DomainGraph.jsx'
import Impact from './components/Impact.jsx'
import RoleFit from './components/RoleFit.jsx'
import Experience from './components/Experience.jsx'
import Projects from './components/Projects.jsx'
import Skills from './components/Skills.jsx'
import Credentials from './components/Credentials.jsx'
import Contact from './components/Contact.jsx'
import Blogs from './components/Blogs.jsx'
import Footer from './components/Footer.jsx'
import VoiceAssistant from './components/VoiceAssistant.jsx'

// 30-second brief: <html data-mode="brief"> hides everything but the header and the brief (styles.css).
// Shareable via ?brief=1 (index.html applies it before first paint); not persisted.
const briefInUrl = () => new URLSearchParams(window.location.search).get('brief') === '1'

export default function App() {
  const [brief, setBrief] = useState(briefInUrl)
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

  useEffect(() => {
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
  }, [brief])

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
          <div className="layout">
            <h2 className="sr-only">Explore the profile</h2>
            <PromptConsole />
            <div className="side">
              <ProfileCard />
              <DomainGraph />
            </div>
          </div>
          <Impact />
          <RoleFit />
          <Experience />
          <Projects />
          <Skills />
          <Credentials />
          <Contact />
          <Blogs />
        </main>
        <Footer />
      </div>
      <VoiceAssistant />
    </>
  )
}
