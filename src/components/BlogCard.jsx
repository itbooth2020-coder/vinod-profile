import feeds from '../data/blogs.json'

// Line icon (24×24, currentColor) in the same style as the site's other SVG icons.
export const BlogIcon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const BASE = import.meta.env.BASE_URL

// Shared layout for one blog: intro, its latest posts and a link to the blog. The posts and their
// thumbnails are fetched at build time (scripts/fetch-blogs.mjs → src/data/blogs.json, public/blog-thumbs/),
// so nothing loads from Blogger until a visitor follows a link.
export default function BlogCard({ blog, icon, variant, cta }) {
  const posts = feeds.blogs?.[variant] || []
  const headingId = `blog-${variant}-h`

  return (
    <article className={`card blog blog--${variant}`} aria-labelledby={headingId}>
      <header className="blog__head">
        <span className="blog__icon" aria-hidden="true">{icon}</span>
        <div>
          <h3 id={headingId}>{blog.name}</h3>
          <p className="blog__tagline">{blog.tagline}</p>
        </div>
      </header>
      <p className="blog__desc">{blog.description}</p>

      <div className="blog__posts">
        <p className="blog__label">Latest posts</p>
        {posts.length === 0 ? (
          <p className="blog__note">Visit the blog to read the latest posts.</p>
        ) : (
          <ul>
            {posts.map((p) => (
              <li key={p.id}>
                <a className="post" href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.thumb ? (
                    <img className="post__thumb" src={`${BASE}${p.thumb}`} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="post__thumb post__thumb--icon" aria-hidden="true">{icon}</span>
                  )}
                  <span className="post__body">
                    <span className="post__title">{p.title}</span>
                    {p.summary && <span className="post__summary">{p.summary}</span>}
                    {p.labels?.length > 0 && <span className="post__labels">{p.labels.join(' · ')}</span>}
                  </span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <a className="btn btn--primary blog__cta" href={blog.url} target="_blank" rel="noopener noreferrer">
        {cta} ↗<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </article>
  )
}
