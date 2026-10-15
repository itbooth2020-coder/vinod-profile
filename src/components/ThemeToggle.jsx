import { useEffect, useState } from 'react'

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
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
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
      aria-label={`Theme: ${theme}`}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path d={ICONS[theme] || ICONS.dark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Theme
    </button>
  )
}
