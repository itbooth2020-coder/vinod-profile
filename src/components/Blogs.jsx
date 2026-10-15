import { useEffect, useRef, useState } from 'react'
import TechBlog from './TechBlog.jsx'
import ComicBlog from './ComicBlog.jsx'

// The latest posts come from Blogger (Google), so the feeds only load once the section is about
// 600px from the viewport, not for every visitor at start-up (PERF-FE-005, ADS-002).
export default function Blogs() {
  const ref = useRef(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    if (!('IntersectionObserver' in window)) return setNear(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  return (
    <section id="blogs" aria-labelledby="blogs-h" ref={ref}>
      <h2 className="sec" id="blogs-h">Blogs</h2>
      <div className="blogs">
        <TechBlog load={near} />
        <ComicBlog load={near} />
      </div>
      <p className="blogs__note">
        Latest posts load from Blogger (Google) when you reach this section. <a href="/privacy.html">Privacy</a>
      </p>
    </section>
  )
}
