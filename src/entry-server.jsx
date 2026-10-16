import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Build-time prerender (PERF-FE-007): vite.config.js renders the app's initial HTML into
// dist/index.html's #root, so the hero paints from the HTML and main.jsx hydrates it.
// Must match the client's first render exactly: browser-only state is read in effects.
export const render = () =>
  renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
