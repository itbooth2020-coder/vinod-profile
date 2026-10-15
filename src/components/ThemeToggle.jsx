import { useEffect, useState } from 'react'

const getInitial = () => {
  try {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
  } catch {}
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  // The visible text is the accessible name ("Theme: dark"), so voice control can say what it sees
  // (WCAG 2.5.3); the title says what a click does.
  return (
    <button
      type="button"
      className="toggle"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      Theme: {theme}
    </button>
  )
}
