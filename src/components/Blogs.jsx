import TechBlog from './TechBlog.jsx'
import ComicBlog from './ComicBlog.jsx'

// "Writing": the tech blog as the main card, the comic blog as a small "Outside work" line below it.
// The id stays "blogs" so existing links, the nav and the tour keep working.
// The latest posts are built into the site (scripts/fetch-blogs.mjs), so this section makes no
// requests to Blogger or Google (ADS-002, PERF-BE-005); thumbnails are local and lazy-loaded.
export default function Blogs() {
  return (
    <section id="blogs" aria-labelledby="blogs-h">
      <h2 className="sec" id="blogs-h">Writing</h2>
      <div className="blogs">
        <TechBlog />
      </div>
      <ComicBlog />
      <p className="blogs__note">
        Post titles are copied from Blogger when the site is built; nothing loads from Google until you open a post. <a href="/privacy.html">Privacy</a>
      </p>
    </section>
  )
}
