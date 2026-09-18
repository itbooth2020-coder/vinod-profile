import { useEffect, useState } from 'react'

export default function Typing({ words }) {
  const [text, setText] = useState(words[0])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let w = 0
    let i = words[0].length
    let del = true
    let t
    const tick = () => {
      const word = words[w]
      i += del ? -1 : 1
      setText(word.slice(0, i))
      let wait = del ? 45 : 90
      if (!del && i === word.length) {
        del = true
        wait = 1400
      } else if (del && i === 0) {
        del = false
        w = (w + 1) % words.length
        wait = 300
      }
      t = setTimeout(tick, wait)
    }
    t = setTimeout(tick, 1400)
    return () => clearTimeout(t)
  }, [words])
  return (
    <p className="hero__typing" aria-label={`Focus areas: ${words.join(', ')}`}>
      <span aria-hidden="true">I build </span>
      <span className="hero__typed" aria-hidden="true">{text}</span>
      <span className="caret" aria-hidden="true" />
    </p>
  )
}
