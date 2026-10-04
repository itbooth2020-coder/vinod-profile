import TechBlog from './TechBlog.jsx'
import ComicBlog from './ComicBlog.jsx'

export default function Blogs() {
  return (
    <section id="blogs" aria-labelledby="blogs-h">
      <h3 className="sec" id="blogs-h">Blogs</h3>
      <div className="blogs">
        <TechBlog />
        <ComicBlog />
      </div>
    </section>
  )
}
