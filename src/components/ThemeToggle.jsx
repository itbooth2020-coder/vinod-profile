import { useEffect, useLayoutEffect, useState } from 'react'

const getInitial = () => {
  try {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
  } catch {}
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

// Sun for the light theme, moon for the dark one (24×24, currentColor, like the site's other icons).
const ICONS = {
  light: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  dark: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
}

export default function ThemeToggle() {
  // null until mounted: the prerendered HTML and hydration can't know the saved theme, so they show
  // 'dark' (index.html's default) and the real one is read before the hydrated page paints. The icon
  // follows <html data-theme> in CSS (styles.css .theme-toggle__icon), so it is right from the first paint.
  const [theme, setTheme] = useState(null)
  const current = theme || 'dark'

  useLayoutEffect(() => setTheme(getInitial()), [])

  useEffect(() => {
    if (!theme) return
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // The visible label is always "Theme" with a sun or moon icon, so the button keeps the same width
  // in both themes and the header doesn't reflow when it's pressed (UI-008). The accessible name is
  // "Theme: dark" / "Theme: light": it starts with the visible text, so voice control can say what it
  // sees (WCAG 2.5.3), and it still says the current theme. The title says what a click does.
  return (
    <button
      type="button"
      className="toggle theme-toggle"
      aria-label={`Theme: ${current}`}
      onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}
      title={`Switch to the ${current === 'dark' ? 'light' : 'dark'} theme`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        {Object.entries(ICONS).map(([id, d]) => (
          <path key={id} className={`theme-toggle__icon theme-toggle__icon--${id}`} d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      Theme
    </button>
  )
}
