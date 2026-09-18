import ScrollProgress from './components/ScrollProgress.jsx'
import useSiteEffects from './hooks/useSiteEffects.js'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import About from './components/About.jsx'
import Snapshot from './components/Snapshot.jsx'
import Expertise from './components/Expertise.jsx'
import Experience from './components/Experience.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  useSiteEffects()
  return (
    <>
      <ScrollProgress />
      <a className="skip-link" href="#main">Skip to content</a>
      <Navbar />
      <main id="main">
        <Hero />
        <About />
        <Snapshot />
        <Expertise />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
