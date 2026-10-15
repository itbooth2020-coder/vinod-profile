import useMotionPaused, { setMotionPaused } from '../hooks/useMotion.js'

// Header toggle that pauses every continuous animation on the page (see hooks/useMotion.js).
// The name stays "Pause animations"; aria-pressed (and the filled style) shows that it's on.
export default function MotionToggle() {
  const paused = useMotionPaused()
  return (
    <button
      type="button"
      className="toggle motion-toggle"
      aria-pressed={paused}
      aria-label="Pause animations"
      title={paused ? 'Animations paused' : 'Pause animations'}
      onClick={() => setMotionPaused(!paused)}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </button>
  )
}
