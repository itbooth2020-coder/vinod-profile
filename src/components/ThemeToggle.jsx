import { useEffect, useState } from 'react'

const getInitial = () => {
  try {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
  } catch {}
  return 'dark'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitial)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button className="theme-toggle" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`}>
      <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}
