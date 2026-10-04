import useBloggerFeed from '../hooks/useBloggerFeed.js'

// Shared layout for one blog: intro, latest posts from its feed, and a link to the blog.
export default function BlogCard({ blog, icon, variant, cta }) {
  const { status, posts } = useBloggerFeed(blog.url)
  const headingId = `blog-${variant}-h`

  return (
    <article className={`card blog blog--${variant}`} aria-labelledby={headingId}>
      <header className="blog__head">
        <span className="blog__icon" aria-hidden="true">{icon}</span>
        <div>
          <h4 id={headingId}>{blog.name}</h4>
          <p className="blog__tagline">{blog.tagline}</p>
        </div>
      </header>
      <p className="blog__desc">{blog.description}</p>

      <div className="blog__posts" aria-busy={status === 'loading'}>
        <p className="blog__label">Latest posts</p>
        {status === 'loading' && <p className="blog__note">Loading posts…</p>}
        {status === 'error' && <p className="blog__note">Couldn't load the latest posts. Visit the blog to read them.</p>}
        {status === 'ready' && posts.length === 0 && <p className="blog__note">No posts yet.</p>}
        {posts.length > 0 && (
          <ul>
            {posts.map((p) => (
              <li key={p.id}>
                <a className="post" href={p.url} target="_blank" rel="noopener noreferrer">
                  {p.thumb ? (
                    <img className="post__thumb" src={p.thumb} alt="" loading="lazy" />
                  ) : (
                    <span className="post__thumb post__thumb--icon" aria-hidden="true">{icon}</span>
                  )}
                  <span className="post__body">
                    <span className="post__title">{p.title}</span>
                    {p.summary && <span className="post__summary">{p.summary}</span>}
                    {p.labels.length > 0 && <span className="post__labels">{p.labels.join(' · ')}</span>}
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
