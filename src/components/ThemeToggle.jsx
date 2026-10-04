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

  return (
    <button
      className="toggle"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-pressed={theme === 'light'}
      aria-label="Light theme"
    >
      Theme: {theme}
    </button>
  )
}
