import { useEffect, useRef, useState } from 'react'

// Exploration tool: try palettes, fonts and custom accent colors, then finalize one in styles.css.
// Palette/font CSS lives in styles.css under [data-palette] / [data-font]; swatches show the dark variant.
export const PALETTES = [
  { id: 'console', name: 'Console', note: 'indigo + teal', swatch: ['#0b0e14', '#8b8cff', '#3dd6c6'] },
  { id: 'blue', name: 'Ocean Blue', note: 'navy + sky', swatch: ['#0a1220', '#2563eb', '#38bdf8'] },
  { id: 'graphite', name: 'Graphite', note: 'grey + slate', swatch: ['#121417', '#cbd5e1', '#94a3b8'] },
  { id: 'noir', name: 'Noir', note: 'black + white', swatch: ['#000000', '#ffffff', '#a3a3a3'] },
  { id: 'mahogany', name: 'Mahogany', note: 'dark reddish-brown', swatch: ['#140c0b', '#c8644c', '#e0a96d'] },
]

export const FONTS = [
  { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
  { id: 'grotesk', name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
  { id: 'plex', name: 'IBM Plex Sans', family: "'IBM Plex Sans', sans-serif" },
  { id: 'serif', name: 'Source Serif', family: "'Source Serif 4', serif" },
  { id: 'system', name: 'System UI', family: 'system-ui, sans-serif' },
]

const KEY = 'site-theme'
const DEFAULTS = { palette: 'console', font: 'inter', accent: '', accent2: '' }

const load = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return DEFAULTS
  }
}

// Black or white text on a custom accent, whichever contrasts more.
const inkFor = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.179 ? '#0b0e14' : '#ffffff'
}

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

export default function ThemePicker() {
  const [theme, setTheme] = useState(load)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resolved, setResolved] = useState({ accent: '', accent2: '' })
  const rootRef = useRef(null)
  const btnRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const el = document.documentElement
    el.dataset.palette = theme.palette
    el.dataset.font = theme.font
    for (const [prop, val] of [['--accent', theme.accent], ['--accent2', theme.accent2]]) {
      val ? el.style.setProperty(prop, val) : el.style.removeProperty(prop)
    }
    theme.accent ? el.style.setProperty('--accent-ink', inkFor(theme.accent)) : el.style.removeProperty('--accent-ink')
    try { localStorage.setItem(KEY, JSON.stringify(theme)) } catch {}
    setResolved({ accent: cssVar('--accent'), accent2: cssVar('--accent2') })
  }, [theme])

  // Light/dark switches change the palette's colors; keep the color inputs in sync.
  useEffect(() => {
    const mo = new MutationObserver(() => setResolved({ accent: cssVar('--accent'), accent2: cssVar('--accent2') }))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector('input:checked')?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const update = (patch) => setTheme((t) => ({ ...t, ...patch }))

  // Picking a palette clears custom colors so the preset shows as designed.
  const pickPalette = (palette) => update({ palette, accent: '', accent2: '' })

  const copy = async () => {
    const mode = document.documentElement.dataset.theme
    const text = `palette: ${theme.palette}, font: ${theme.font}, mode: ${mode}, accent: ${resolved.accent}, accent2: ${resolved.accent2}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  return (
    <div className="picker" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="toggle"
        aria-expanded={open}
        aria-controls="theme-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="picker__dot" aria-hidden="true" /> Customize
      </button>

      {open && (
        <div className="picker__panel card" id="theme-panel" ref={panelRef} role="region" aria-label="Theme options">
          <fieldset>
            <legend>Color palette</legend>
            <div className="picker__palettes">
              {PALETTES.map((p) => (
                <label key={p.id} className="picker__palette">
                  <input
                    type="radio"
                    name="palette"
                    value={p.id}
                    checked={theme.palette === p.id}
                    onChange={() => pickPalette(p.id)}
                  />
                  <span className="picker__swatches" aria-hidden="true">
                    {p.swatch.map((c) => <i key={c} style={{ background: c }} />)}
                  </span>
                  <span className="picker__name">{p.name}</span>
                  <span className="picker__note">{p.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Font</legend>
            <div className="picker__fonts">
              {FONTS.map((f) => (
                <label key={f.id} className="picker__font" style={{ fontFamily: f.family }}>
                  <input type="radio" name="font" value={f.id} checked={theme.font === f.id} onChange={() => update({ font: f.id })} />
                  {f.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Custom color codes</legend>
            <div className="picker__colors">
              {[['accent', 'Primary'], ['accent2', 'Secondary']].map(([key, label]) => (
                <label key={key} className="picker__color">
                  <input
                    type="color"
                    value={resolved[key] || '#000000'}
                    onChange={(e) => update({ [key]: e.target.value })}
                  />
                  <span>
                    {label}
                    <code>{resolved[key]}</code>
                  </span>
                </label>
              ))}
            </div>
            <button type="button" className="icon-btn" onClick={() => update({ accent: '', accent2: '' })} disabled={!theme.accent && !theme.accent2}>
              Reset to palette colors
            </button>
          </fieldset>

          <div className="picker__foot">
            <button type="button" className="icon-btn" onClick={copy}>{copied ? 'Copied ✓' : 'Copy my choice'}</button>
            <button type="button" className="icon-btn" onClick={() => setTheme(DEFAULTS)}>Reset all</button>
          </div>
          <p className="picker__hint" role="status">
            {copied ? 'Copied. Paste it to finalize this theme.' : 'Use the Theme button to preview light and dark.'}
          </p>
        </div>
      )}
    </div>
  )
}
