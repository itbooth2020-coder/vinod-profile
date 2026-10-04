import { useEffect, useMemo, useRef, useState } from 'react'
import { graphDomains, graphProjects, profile } from '../data.js'

// Radial tree: Vinod -> vertical | domain -> project -> technologies.
const RADII = [0, 150, 290, 420]
const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 1.25
const GROUPS = { vertical: 'Vertical', domain: 'Domain' }

function buildTree(groupBy) {
  const groups =
    groupBy === 'vertical' ? [...new Set(graphProjects.map((p) => p.vertical))] : graphDomains
  return {
    id: 'root',
    label: 'Vinod',
    type: 'root',
    children: groups.map((g) => ({
      id: `g:${g}`,
      label: g,
      type: groupBy,
      children: graphProjects
        .filter((p) => (groupBy === 'vertical' ? p.vertical === g : p.domains.includes(g)))
        .map((p) => ({
          id: `g:${g}/p:${p.short}`,
          label: p.short,
          type: 'project',
          project: p,
          children: p.tech.map((t) => ({ id: `g:${g}/p:${p.short}/t:${t}`, label: t, type: 'tech', children: [] })),
        })),
    })),
  }
}

const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r]

function layout(root, expanded) {
  const visibleKids = (n) => (expanded.has(n.id) ? n.children : [])
  const leaves = (n) => {
    const kids = visibleKids(n)
    return kids.length ? kids.reduce((s, k) => s + leaves(k), 0) : 1
  }
  const nodes = []
  const place = (n, depth, a0, a1, parent) => {
    const angle = depth === 0 ? -Math.PI / 2 : (a0 + a1) / 2
    const [x, y] = polar(angle, RADII[depth])
    const item = { n, depth, angle, x, y, parent }
    nodes.push(item)
    const kids = visibleKids(n)
    const total = leaves(n)
    let a = a0
    for (const k of kids) {
      const span = ((a1 - a0) * leaves(k)) / total
      place(k, depth + 1, a, a + span, item)
      a += span
    }
  }
  place(root, 0, -Math.PI / 2, (Math.PI * 3) / 2, null)
  return nodes
}

const labelWidth = (n) => n.label.length * (n.type === 'tech' ? 7 : 8.5) + 24

function bounds(nodes) {
  let [x0, y0, x1, y1] = [-120, -90, 120, 90]
  for (const { n, x, y } of nodes) {
    const w = labelWidth(n)
    x0 = Math.min(x0, x - w)
    x1 = Math.max(x1, x + w)
    y0 = Math.min(y0, y - 30)
    y1 = Math.max(y1, y + 30)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

function edgeCurve(p, c) {
  const rm = (RADII[p.depth] + RADII[c.depth]) / 2
  return [[p.x, p.y], polar(p.depth === 0 ? c.angle : p.angle, rm), polar(c.angle, rm), [c.x, c.y]]
}

function edgePath(p, c) {
  const [a, b, d, e] = edgeCurve(p, c)
  return `M${a[0]},${a[1]} C${b[0]},${b[1]} ${d[0]},${d[1]} ${e[0]},${e[1]}`
}

// Point at s (0..1) along an edge's cubic curve, for the dots flowing outward from Vinod.
function pointOnEdge(p, c, s) {
  const [a, b, d, e] = edgeCurve(p, c)
  const u = 1 - s
  const at = (k) => u * u * u * a[k] + 3 * u * u * s * b[k] + 3 * u * s * s * d[k] + s * s * s * e[k]
  return [at(0), at(1)]
}

// Gentle drift: each node orbits its layout spot by a few units; edges follow because they're
// drawn from the drifted positions. The viewBox uses the still layout so the frame doesn't jitter.
function drift(nodes, t) {
  if (!t) return nodes
  const moved = new Map()
  for (const [i, item] of nodes.entries()) {
    if (item.depth === 0) {
      moved.set(item.n.id, item)
      continue
    }
    const amp = item.depth === 1 ? 6 : 4
    const seed = i * 1.7
    moved.set(item.n.id, {
      ...item,
      x: item.x + Math.cos(t * 0.7 + seed) * amp,
      y: item.y + Math.sin(t * 0.9 + seed) * amp,
    })
  }
  return nodes.map((item) => {
    const m = moved.get(item.n.id)
    return item.parent ? { ...m, parent: moved.get(item.parent.n.id) } : m
  })
}

// Animation clock (seconds) that only runs while the graph is on screen, the tab is visible,
// nothing is being dragged, and the visitor hasn't asked for reduced motion.
function useFloatClock(ref, paused) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0
    let last = 0
    let visible = true
    const start = performance.now() - t * 1000
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (now - last < 33) return // ~30fps is smooth enough for a slow drift
      last = now
      setT((now - start) / 1000)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      if (!paused && visible && !document.hidden && !rm.matches) raf = requestAnimationFrame(tick)
      else if (rm.matches) setT(0)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(ref.current)
    document.addEventListener('visibilitychange', sync)
    rm.addEventListener('change', sync)
    sync()
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      rm.removeEventListener('change', sync)
    }
  }, [paused, ref])
  return t
}

function Node({ item, selected, expanded, onActivate }) {
  const { n, x, y, angle } = item
  const hasKids = n.children.length > 0
  const activate = () => onActivate(n)
  const props = {
    className: `gnode gnode--${n.type === 'vertical' || n.type === 'domain' ? 'group' : n.type}${selected ? ' is-selected' : ''}`,
    transform: `translate(${x},${y})`,
    role: 'button',
    tabIndex: 0,
    'aria-label': `${n.label}, ${n.type}${hasKids ? `, ${n.children.length} items` : ''}`,
    'aria-expanded': hasKids ? expanded : undefined,
    'aria-pressed': selected,
    onClick: activate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        activate()
      }
    },
  }

  if (n.type === 'root') {
    return (
      <g {...props}>
        <circle r="32" />
        <text dy="5" textAnchor="middle">{n.label}</text>
      </g>
    )
  }
  if (item.depth === 1) {
    const w = labelWidth(n)
    return (
      <g {...props}>
        <rect x={-w / 2} y="-16" width={w} height="32" rx="16" />
        <text dy="5" textAnchor="middle">{n.label}{hasKids && (expanded ? ' −' : ' +')}</text>
      </g>
    )
  }
  const r = n.type === 'tech' ? 5 : 8
  const cos = Math.cos(angle)
  const anchor = cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle'
  const tx = anchor === 'start' ? r + 6 : anchor === 'end' ? -(r + 6) : 0
  const ty = anchor === 'middle' ? (Math.sin(angle) > 0 ? r + 16 : -(r + 8)) : 4
  return (
    <g {...props}>
      <circle r={r} />
      {hasKids && !expanded && <circle className="gnode__more" r={r + 4} />}
      <text x={tx} y={ty} textAnchor={anchor}>{n.label}</text>
    </g>
  )
}

function Details({ node }) {
  if (!node) return null
  if (node.type === 'root') {
    return (
      <>
        <h4>{profile.name}</h4>
        <p>{profile.headline}. Select a node to explore verticals, projects and technologies.</p>
      </>
    )
  }
  if (node.type === 'project') {
    const p = node.project
    return (
      <>
        <h4>{p.name}</h4>
        <p className="gdetails__meta">{p.vertical} · {p.domains.join(', ')}</p>
        <p>{p.text}</p>
        {p.tech.length > 0 && (
          <ul className="tags">{p.tech.map((t) => <li key={t}>{t}</li>)}</ul>
        )}
      </>
    )
  }
  if (node.type === 'tech') {
    const used = graphProjects.filter((p) => p.tech.includes(node.label)).map((p) => p.short)
    return (
      <>
        <h4>{node.label}</h4>
        <p className="gdetails__meta">technology</p>
        <p>Used in: {used.join(', ')}</p>
      </>
    )
  }
  return (
    <>
      <h4>{node.label}</h4>
      <p className="gdetails__meta">{node.type} · {node.children.length} projects</p>
      <p>{node.children.map((c) => c.project.name).join(' · ')}</p>
    </>
  )
}

export default function GraphView({ large = false }) {
  const [groupBy, setGroupBy] = useState('vertical')
  const [expanded, setExpanded] = useState(() => new Set(['root']))
  const [selectedId, setSelectedId] = useState('root')
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const svgRef = useRef(null)
  const drag = useRef(null)
  const [dragging, setDragging] = useState(false)

  const tree = useMemo(() => buildTree(groupBy), [groupBy])
  const nodes = useMemo(() => layout(tree, expanded), [tree, expanded])
  const box = useMemo(() => bounds(nodes), [nodes])
  const selected = nodes.find((i) => i.n.id === selectedId)?.n ?? tree
  const allParents = useMemo(() => {
    const ids = []
    const walk = (n) => n.children.length && (ids.push(n.id), n.children.forEach(walk))
    walk(tree)
    return ids
  }, [tree])

  const zoom = (f) => setView((v) => ({ ...v, k: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * f)) }))
  const resetView = () => setView({ k: 1, x: 0, y: 0 })

  const changeGroup = (g) => {
    setGroupBy(g)
    setExpanded(new Set(['root']))
    setSelectedId('root')
    resetView()
  }

  const onActivate = (n) => {
    setSelectedId(n.id)
    if (!n.children.length || n.type === 'root') return
    setExpanded((prev) => {
      if (prev.has(n.id)) {
        const next = new Set(prev)
        next.delete(n.id)
        return next
      }
      // Inline card drills down one branch at a time so it stays readable; the dialog can open many.
      const keep = large ? [...prev] : [...prev].filter((id) => id === 'root' || n.id.startsWith(id + '/'))
      return new Set([...keep, n.id])
    })
  }

  // Wheel zoom only in the dialog, so the inline card never hijacks page scrolling.
  useEffect(() => {
    if (!large) return
    const svg = svgRef.current
    const onWheel = (e) => {
      e.preventDefault()
      zoom(Math.exp(-e.deltaY * 0.0015))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [large])

  // svg units per screen pixel (viewBox is fitted with "meet")
  const unitsPerPx = () => {
    const r = svgRef.current.getBoundingClientRect()
    return Math.max(box.w / r.width, box.h / r.height)
  }

  const onPointerDown = (e) => {
    if (e.target.closest('.gnode') || e.button !== 0) return
    drag.current = { px: e.clientX, py: e.clientY, s: unitsPerPx() }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.px) * d.s
    const dy = (e.clientY - d.py) * d.s
    d.px = e.clientX
    d.py = e.clientY
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  const t = useFloatClock(svgRef, dragging)
  const shown = useMemo(() => drift(nodes, t), [nodes, t])
  // Dots flow along the edges out of Vinod and out of each open group.
  const flows = t
    ? shown
        .filter((i) => i.parent && i.depth <= 2)
        .map((i, k) => ({ id: i.n.id, pos: pointOnEdge(i.parent, i, (t / 3.2 + k * 0.37) % 1) }))
    : []

  const onKeyDown = (e) => {
    const pan = 40
    const keys = {
      '+': () => zoom(ZOOM_STEP),
      '=': () => zoom(ZOOM_STEP),
      '-': () => zoom(1 / ZOOM_STEP),
      0: resetView,
      ArrowLeft: () => setView((v) => ({ ...v, x: v.x + pan })),
      ArrowRight: () => setView((v) => ({ ...v, x: v.x - pan })),
      ArrowUp: () => setView((v) => ({ ...v, y: v.y + pan })),
      ArrowDown: () => setView((v) => ({ ...v, y: v.y - pan })),
    }
    if (keys[e.key] && !(e.key.startsWith('Arrow') && e.target !== e.currentTarget)) {
      e.preventDefault()
      keys[e.key]()
    }
  }

  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2

  return (
    <div className={`gview${large ? ' gview--large' : ''}`}>
      <div className="gtoolbar">
        <div className="gseg" role="group" aria-label="Group projects by">
          {Object.entries(GROUPS).map(([g, label]) => (
            <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => changeGroup(g)}>
              {label}
            </button>
          ))}
        </div>
        <div className="gseg" role="group" aria-label="Expand">
          <button type="button" onClick={() => setExpanded(new Set(allParents))}>Expand all</button>
          <button type="button" onClick={() => setExpanded(new Set(['root']))}>Collapse</button>
        </div>
        <div className="gseg" role="group" aria-label="Zoom">
          <button type="button" onClick={() => zoom(1 / ZOOM_STEP)} aria-label="Zoom out" disabled={view.k <= ZOOM_MIN}>−</button>
          <button type="button" onClick={resetView} aria-label="Reset zoom and position">{Math.round(view.k * 100)}%</button>
          <button type="button" onClick={() => zoom(ZOOM_STEP)} aria-label="Zoom in" disabled={view.k >= ZOOM_MAX}>+</button>
        </div>
      </div>

      <svg
        ref={svgRef}
        className="gsvg"
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        role="group"
        aria-label={`Graph of ${profile.name}'s work by ${groupBy}. Use Tab to move between nodes, Enter to expand, plus and minus to zoom, arrow keys to pan.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <g transform={`translate(${cx + view.x},${cy + view.y}) scale(${view.k}) translate(${-cx},${-cy})`}>
          {shown.filter((i) => i.parent).map((i) => (
            <path key={`e-${i.n.id}`} className={`gedge gedge--d${i.depth}`} d={edgePath(i.parent, i)} />
          ))}
          {flows.map((f) => (
            <circle key={`f-${f.id}`} className="gflow" cx={f.pos[0]} cy={f.pos[1]} r="3.5" aria-hidden="true" />
          ))}
          {shown.map((i) => (
            <Node
              key={i.n.id}
              item={i}
              selected={i.n.id === selected.id}
              expanded={expanded.has(i.n.id)}
              onActivate={onActivate}
            />
          ))}
        </g>
      </svg>

      <div className="gdetails" aria-live="polite">
        <Details node={selected} />
      </div>
    </div>
  )
}
