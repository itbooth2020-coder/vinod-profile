import ThemeToggle from './ThemeToggle.jsx'

const links = [
  { href: '#console', label: 'console' },
  { href: '#experience', label: 'experience' },
  { href: '#projects', label: 'projects' },
  { href: '#skills', label: 'skills' },
  { href: '#contact', label: 'contact' },
]

export default function Header() {
  return (
    <header className="header">
      <a href="#top" className="brand"><b>&gt;</b> vinod.profile / console</a>
      <nav aria-label="Sections" className="nav">
        {links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  )
}
