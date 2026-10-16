import { Component, createRef, lazy } from 'react'
import { importAgain } from '../importAgain.js'

// FUNC-014: a lazy section whose chunk fails to load (a dropped request, a CDN error, a blocked
// script) must not take the whole page with it. Each lazy section gets its own boundary, which
// shows the section's heading, "This section couldn't load." and a Retry button in its place, at
// the placeholder's reserved height (pass the placeholder's className), so nothing shifts.

// A lazy component whose import is tried twice (a dropped request often succeeds a moment later)
// and can be reset, so Retry starts a fresh import instead of reusing the failed one.
export function lazyRetry(load) {
  let Lazy
  const reset = () => {
    Lazy = lazy(() => importAgain(load))
  }
  reset()
  function Section(props) {
    return <Lazy {...props} />
  }
  Section.reset = reset
  return Section
}

// Props: children; onRetry (e.g. a lazyRetry component's reset); and for the built-in fallback:
// title, id, className (the placeholder's, for its reserved height), level (heading level, 2 or 3)
// and tag ('section' or 'div'). Or fallback: a node, or (retry) => node, for a custom one.
export default class SectionBoundary extends Component {
  state = { failed: false, tries: 0 }
  retryRef = createRef()

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidUpdate(_, prev) {
    // Failed again after a Retry: keep keyboard focus on the button rather than losing it.
    if (this.state.failed && !prev.failed && this.state.tries > 0) this.retryRef.current?.focus()
  }

  retry = () => {
    // A Retry that failed too means a dependency the browser won't fetch again: reload instead.
    if (this.state.tries >= 1) return window.location.reload()
    this.props.onRetry?.()
    this.setState((s) => ({ failed: false, tries: s.tries + 1 }))
  }

  render() {
    if (!this.state.failed) return this.props.children
    const { fallback, title, id, className = '', level = 2, tag: Tag = 'section' } = this.props
    if (fallback !== undefined) return typeof fallback === 'function' ? fallback(this.retry) : fallback
    const Heading = `h${level}`
    const headingId = `${(id || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-err-h`
    return (
      <Tag id={id} className={`${className} section-error`.trim()} aria-labelledby={headingId}>
        <Heading className={level === 2 ? 'sec' : undefined} id={headingId}>{title}</Heading>
        <p>This section couldn't load.</p>
        <button type="button" className="btn" ref={this.retryRef} onClick={this.retry}>
          {this.state.tries >= 1 ? 'Reload page' : 'Retry'}
        </button>
      </Tag>
    )
  }
}
