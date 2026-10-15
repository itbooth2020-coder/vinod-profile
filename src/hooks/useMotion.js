import { useSyncExternalStore } from 'react'

// "Pause animations" (WCAG 2.2.2): one site-wide setting, shown in the header (MotionToggle.jsx).
// Paused sets <html data-motion="paused">, which stops the CSS animations (styles.css); the domain
// graph, VINCE's orb and the rotating quotes read it with useMotionPaused(). The choice is saved in
// localStorage; with no saved choice it follows prefers-reduced-motion. index.html applies the saved
// or default state before first paint.
const KEY = 'motion-paused'
const reduce = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function saved() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === '1' || v === '0') return v === '1'
  } catch {
    /* storage unavailable */
  }
  return null
}

let paused = saved() ?? reduce()
const listeners = new Set()

function apply() {
  const root = document.documentElement
  if (paused) root.dataset.motion = 'paused'
  else delete root.dataset.motion
}
if (typeof document !== 'undefined') apply()

export const motionPaused = () => paused

export function setMotionPaused(next) {
  paused = next
  try {
    localStorage.setItem(KEY, next ? '1' : '0')
  } catch {
    /* the choice lasts for this visit only */
  }
  apply()
  listeners.forEach((l) => l())
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export default function useMotionPaused() {
  return useSyncExternalStore(subscribe, motionPaused, () => false)
}
