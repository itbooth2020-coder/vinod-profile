import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const app = (
  <StrictMode>
    <App />
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
