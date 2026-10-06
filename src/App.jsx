import ScrollProgress from './components/ScrollProgress.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import PromptConsole from './components/PromptConsole.jsx'
import ProfileCard from './components/ProfileCard.jsx'
import DomainGraph from './components/DomainGraph.jsx'
import Impact from './components/Impact.jsx'
import Experience from './components/Experience.jsx'
import Projects from './components/Projects.jsx'
import Skills from './components/Skills.jsx'
import Credentials from './components/Credentials.jsx'
import Contact from './components/Contact.jsx'
import Blogs from './components/Blogs.jsx'
import Footer from './components/Footer.jsx'
import VoiceAssistant from './components/VoiceAssistant.jsx'

export default function App() {
  return (
    <>
      <ScrollProgress />
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap">
        <Header />
        <main id="main">
          <Hero />
          <div className="layout">
            <PromptConsole />
            <div className="side">
              <ProfileCard />
              <DomainGraph />
            </div>
          </div>
          <Impact />
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
