import ThemeToggle from './ThemeToggle.jsx'
import ThemePicker from './ThemePicker.jsx'
import MotionToggle from './MotionToggle.jsx'

// Same order as the sections in App.jsx.
const links = [
  { href: '#lead', label: 'leadership' },
  { href: '#projects', label: 'projects' },
  { href: '#experience', label: 'experience' },
  { href: '#fit', label: 'role fit' },
  { href: '#skills', label: 'skills' },
  { href: '#blogs', label: 'writing' },
  { href: '#contact', label: 'contact' },
]

// Opens VINCE's panel (Vince.jsx queues the event until the panel has loaded). data-vince-trigger:
// VINCE's outside-click close ignores it, so the press doesn't close him as it opens him.
const openVince = () => window.dispatchEvent(new Event('vince:open'))

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
        {/* After the sections: an action, not a place on the page. On phones CSS shows it first in the
            scrolling row, so it's visible without swiping (UX-012). Hidden without JavaScript (index.html). */}
        <button type="button" className="nav__vince" onClick={openVince} aria-haspopup="dialog" data-vince-trigger>
          ask VINCE
        </button>
      </nav>
      <div className="header__tools">
        <ThemePicker />
        <MotionToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
