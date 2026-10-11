import ThemeToggle from './ThemeToggle.jsx'
import ThemePicker from './ThemePicker.jsx'

// Same order as the sections in App.jsx.
const links = [
  { href: '#lead', label: 'leadership' },
  { href: '#projects', label: 'projects' },
  { href: '#experience', label: 'experience' },
  { href: '#fit', label: 'role fit' },
  { href: '#console', label: 'ask AI' },
  { href: '#skills', label: 'skills' },
  { href: '#blogs', label: 'blogs' },
  { href: '#contact', label: 'contact' },
]

export default function Header() {
  return (
    <header className="header">
      {/* On narrow screens the middle name shortens to "P." visually; screen readers always get the full name. */}
      <a href="#top" className="brand">
        <b aria-hidden="true">&gt;</b> Vinod <span className="brand__mid">Pyarelal</span>
        <span className="brand__init" aria-hidden="true">P.</span> Yadav
      </a>
      <nav aria-label="Sections" className="nav">
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>
      <div className="header__tools">
        <ThemePicker />
        <ThemeToggle />
      </div>
    </header>
  )
}
