import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import SectionBoundary from './components/SectionBoundary.jsx'
import { profile } from './data.js'
import './styles.css'

// SEC-004: a last-resort boundary, so an error outside the sections' own boundaries (App.jsx) shows a
// short message with a way out instead of an empty page.
const failed = (
  <main id="main" className="wrap section-error">
    <h1>{profile.name}</h1>
    <p>Something went wrong showing this page.</p>
    <p>
      <a className="btn" href="/">Reload the page</a> or email <a href={`mailto:${profile.email}`}>{profile.email}</a>.
    </p>
  </main>
)

const app = (
  <StrictMode>
    <SectionBoundary fallback={failed}>
      <App />
    </SectionBoundary>
  </StrictMode>
)

// Production builds prerender the app into #root (vite.config.js, PERF-FE-007): hydrate it, so the
// hero painted from the HTML stays. The dev server serves an empty #root: render.
// Hydration is one long task, so it starts after the next frame: the browser paints the prerendered
// page first even when the bundle arrives before the first paint (fast or cached loads).
const root = document.getElementById('root')
const hydrate = () => hydrateRoot(root, app)
if (!root.firstElementChild) createRoot(root).render(app)
else if (document.visibilityState === 'hidden') hydrate()
else requestAnimationFrame(() => setTimeout(hydrate))
