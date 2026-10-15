import { useEffect, useRef } from 'react'
import useMotionPaused from '../hooks/useMotion.js'

// VINCE's face: a glowing particle sphere with rotating HUD rings, drawn on a canvas.
// It breathes slowly while idle and reacts to state: ripples while listening, a fast scanning
// arc while thinking, and a voice waveform while speaking (energyRef pulses on each word).
// Visitors who prefer reduced motion, or who pause animations (header toggle), get a still frame that
// changes only with the state. While idle it animates for IDLE_MS, then rests on its last frame until
// VINCE listens, thinks or speaks again.
// Colours come from the site theme (--accent, --accent2, --bg) and update live when it changes.
// Dark pages blend additively for a glow; light pages paint normally with deeper shades and
// slightly stronger alphas, since additive light washes out on a light background.

const STATES = {
  idle: { spin: 0.12, ring: 0.35, glow: 0.55, jitter: 0.015 },
  listening: { spin: 0.3, ring: 0.9, glow: 0.75, jitter: 0.04 },
  thinking: { spin: 0.55, ring: 1.8, glow: 0.6, jitter: 0.025 },
  speaking: { spin: 0.25, ring: 0.6, glow: 0.8, jitter: 0.035 },
}

// Points spread evenly over a unit sphere (Fibonacci lattice).
function spherePoints(n) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    pts.push({ x: Math.cos(golden * i) * r, y, z: Math.sin(golden * i) * r, seed: Math.random() * 100 })
  }
  return pts
}

// '#rgb', '#rrggbb' or 'rgb()/rgba()' (comma or space syntax) -> [r, g, b]. Anything else (e.g.
// a named colour) is normalised by the canvas itself; null if it still can't be read.
function parseColor(value, ctx) {
  let v = value.trim()
  if (!v) return null
  if (!/^(#|rgba?\()/i.test(v)) {
    ctx.fillStyle = '#000'
    ctx.fillStyle = v
    v = String(ctx.fillStyle)
  }
  let m = v.match(/^#([0-9a-f]{3,8})$/i)
  if (m) {
    const hx = m[1].length < 6 ? [...m[1].slice(0, 3)].map((c) => c + c).join('') : m[1]
    return [0, 2, 4].map((i) => parseInt(hx.slice(i, i + 2), 16))
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  return m ? [m[1], m[2], m[3]].map((n) => Math.round(Math.min(255, +n))) : null
}

const mixRGB = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t)) // t = share of b
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a)})`
const IDLE_MS = 6000
const WHITE = [255, 255, 255]
const BLACK = [0, 0, 0]
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

export default function ArcOrb({ state = 'idle', energyRef, className = '' }) {
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  const drawRef = useRef(null)
  const startRef = useRef(null)
  const paused = useMotionPaused()
  const pausedRef = useRef(paused)
  const idleSince = useRef(performance.now())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const still = () => reduce.matches || pausedRef.current
    const pts = spherePoints(560)
    const sparks = Array.from({ length: 36 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), v: 0.2 + Math.random() * 0.5 }))
    const p = { ...STATES.idle }
    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let last = performance.now()
    let t = 0

    // Theme colours, re-read whenever the page theme changes.
    const c = {}
    const readColors = () => {
      const cs = getComputedStyle(canvas)
      const a = parseColor(cs.getPropertyValue('--accent'), ctx) || [255, 166, 77]
      const b = parseColor(cs.getPropertyValue('--accent2'), ctx) || a
      const bg = parseColor(cs.getPropertyValue('--bg'), ctx)
      c.light = bg ? luminance(bg) > 0.5 : document.documentElement.dataset.theme === 'light'
      c.halo = a
      c.mid = b
      if (c.light) {
        c.op = 'source-over'
        c.k = 1.3 // alpha boost
        c.ring = mixRGB(a, BLACK, 0.25)
        c.core = mixRGB(a, WHITE, 0.7)
        c.back = a
        c.front = mixRGB(b, BLACK, 0.2)
        c.wave = c.ring
        c.spark = b
      } else {
        c.op = 'lighter'
        c.k = 1
        c.ring = a
        c.core = mixRGB(a, WHITE, 0.85)
        c.back = a
        c.front = mixRGB(b, WHITE, 0.3)
        c.wave = c.front
        c.spark = mixRGB(b, WHITE, 0.2)
      }
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      if (!raf) draw(0) // resizing clears the canvas; redraw it when the loop is resting
    }

    const arc = (r, a0, a1, width, alpha) => {
      ctx.beginPath()
      ctx.arc(w / 2, h / 2, r, a0, a1)
      ctx.lineWidth = width
      ctx.strokeStyle = rgba(c.ring, alpha * c.k)
      ctx.stroke()
    }

    function draw(dt) {
      const s = stateRef.current
      const target = STATES[s] || STATES.idle
      for (const k in p) p[k] += (target[k] - p[k]) * Math.min(1, dt * 3)
      const energyIn = energyRef?.current ?? 0
      if (energyRef) energyRef.current = energyIn * Math.pow(0.04, dt) // decays within ~1s
      const energy = s === 'speaking' ? Math.min(1, 0.25 + energyIn * 0.75 + Math.sin(t * 17) * 0.08) : 0

      const cx = w / 2
      const cy = h / 2
      const breath = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / 4.5)
      const R = Math.min(w, h) * 0.27 * (1 + breath * 0.04 + energy * 0.06)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = c.op

      // Halo and molten core.
      let g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 2)
      g.addColorStop(0, rgba(c.halo, 0.3 * p.glow + breath * 0.08))
      g.addColorStop(1, rgba(c.halo, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.6)
      g.addColorStop(0, rgba(c.core, 0.85 + energy * 0.15))
      g.addColorStop(0.3, rgba(c.mid, (0.55 + breath * 0.2) * c.k))
      g.addColorStop(1, rgba(c.halo, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.6, 0, Math.PI * 2)
      ctx.fill()

      // Tangled inner filaments.
      for (let i = 0; i < 7; i++) {
        const a = t * (0.6 + i * 0.13) * (i % 2 ? 1 : -1) + i
        arc(R * (0.22 + i * 0.045), a, a + 1.4 + Math.sin(t + i) * 0.6, 1.2, 0.35 + energy * 0.3)
      }

      // Particle shell, rotated in 3D and projected.
      const ay = t * p.spin
      const ax = 0.45 + Math.sin(t * 0.2) * 0.15
      const [sy, cyA, sx, cxA] = [Math.sin(ay), Math.cos(ay), Math.sin(ax), Math.cos(ax)]
      const [b0, b1] = [c.back, c.front] // back-to-front particle tint
      for (const q of pts) {
        const x1 = q.x * cyA + q.z * sy
        const z1 = -q.x * sy + q.z * cyA
        const y2 = q.y * cxA - z1 * sx
        const z2 = q.y * sx + z1 * cxA
        const rr = R * (1 + (p.jitter + energy * 0.05) * Math.sin(q.seed * 13 + t * 3))
        const depth = (z2 + 1) / 2
        const size = 0.6 + depth * 1.5
        ctx.fillStyle = `rgba(${(b0[0] + (b1[0] - b0[0]) * depth) | 0},${(b0[1] + (b1[1] - b0[1]) * depth) | 0},${(b0[2] + (b1[2] - b0[2]) * depth) | 0},${Math.min(1, (0.12 + depth * 0.7) * c.k)})`
        ctx.fillRect(cx + x1 * rr - size / 2, cy + y2 * rr - size / 2, size, size)
      }

      // Voice waveform hugging the sphere while speaking.
      if (energy > 0.01) {
        ctx.beginPath()
        for (let i = 0; i <= 120; i++) {
          const a = (i / 120) * Math.PI * 2
          const r = R * 1.1 + Math.sin(a * 9 + t * 9) * Math.sin(a * 4 - t * 5) * R * 0.09 * energy
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        }
        ctx.lineWidth = 1.5
        ctx.strokeStyle = rgba(c.wave, (0.4 + energy * 0.5) * c.k)
        ctx.stroke()
      }

      // HUD rings: dashed, ticked and segmented, each turning at its own pace.
      ctx.setLineDash([R * 0.14, R * 0.06])
      ctx.lineDashOffset = -t * 30 * p.ring
      arc(R * 1.28, 0, Math.PI * 2, 2, 0.5)
      ctx.setLineDash([])
      const tick = -t * 0.15 * p.ring
      ctx.strokeStyle = rgba(c.ring, 0.45 * c.k)
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 90; i++) {
        const a = tick + (i / 90) * Math.PI * 2
        const len = i % 6 === 0 ? R * 0.09 : R * 0.04
        ctx.moveTo(cx + Math.cos(a) * R * 1.45, cy + Math.sin(a) * R * 1.45)
        ctx.lineTo(cx + Math.cos(a) * (R * 1.45 + len), cy + Math.sin(a) * (R * 1.45 + len))
      }
      ctx.stroke()
      for (let i = 0; i < 3; i++) {
        const a = t * 0.4 * p.ring + (i * Math.PI * 2) / 3
        arc(R * 1.68, a, a + 0.75, 3, 0.65)
      }
      arc(R * 1.82, -t * 0.25, -t * 0.25 + 2.2, 1, 0.35)

      // Thinking: a bright arc sweeping round.
      if (s === 'thinking') {
        const a = t * 4
        arc(R * 1.28, a, a + 0.9, 4, 0.9)
      }

      // Listening: ripples spreading outward.
      if (s === 'listening') {
        for (let i = 0; i < 3; i++) {
          const k = (t * 0.7 + i / 3) % 1
          arc(R * (1.05 + k * 0.9), 0, Math.PI * 2, 1.5, 0.5 * (1 - k))
        }
      }

      // Sparks thrown off the surface.
      ctx.lineWidth = 1
      for (const sp of sparks) {
        sp.r += dt * sp.v * (0.4 + p.ring * 0.4)
        sp.a += dt * 0.3
        if (sp.r > 1) {
          sp.r = 0
          sp.a = Math.random() * Math.PI * 2
        }
        const r0 = R * (1 + sp.r * 0.9)
        const r1 = r0 + R * 0.08
        ctx.strokeStyle = rgba(c.spark, 0.7 * (1 - sp.r) * c.k)
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(sp.a) * r0, cy + Math.sin(sp.a) * r0)
        ctx.lineTo(cx + Math.cos(sp.a + 0.05) * r1, cy + Math.sin(sp.a + 0.05) * r1)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    drawRef.current = () => draw(1)

    const tick = (now) => {
      if (stateRef.current === 'idle' && now - idleSince.current > IDLE_MS) {
        raf = 0 // rest on the current frame
        return
      }
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (document.hidden) return
      t += dt
      draw(dt)
    }
    // Only animate while the canvas is on screen, so several orbs on a page stay cheap.
    let visible = true
    const start = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (still()) draw(1)
      else if (visible) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(([entry]) => {
            const next = entry.isIntersecting
            if (next === visible) return
            visible = next
            start()
          })
        : null
    io?.observe(canvas)

    // Follow theme changes live: light/dark toggle, palette, custom accent (inline style on <html>).
    const onTheme = () => {
      readColors()
      if (!raf) draw(still() ? 1 : 0)
    }
    const mo = new MutationObserver(onTheme)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-theme', 'data-palette'] })
    const scheme = window.matchMedia('(prefers-color-scheme: dark)')
    scheme.addEventListener('change', onTheme)

    readColors()
    resize()
    reduce.addEventListener('change', start)
    startRef.current = start
    start()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io?.disconnect()
      mo.disconnect()
      scheme.removeEventListener('change', onTheme)
      reduce.removeEventListener('change', start)
    }
  }, [energyRef])

  // Keep the loop reading the latest state; wake it when VINCE becomes active (or redraw the still
  // frame when motion is reduced or paused).
  useEffect(() => {
    stateRef.current = state
    idleSince.current = performance.now()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || pausedRef.current) drawRef.current?.()
    else startRef.current?.()
  }, [state])

  useEffect(() => {
    pausedRef.current = paused
    startRef.current?.()
  }, [paused])

  return <canvas ref={canvasRef} className={`orb ${className}`} aria-hidden="true" />
}
