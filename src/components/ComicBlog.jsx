import { blogs } from '../data.js'

// Batman: The Legend, his comic fan blog: a small "Outside work" line under the tech blog, with no
// posts or thumbnails, so the Writing section leads with professional content (DES-001, ADS-004).
export default function ComicBlog() {
  return (
    <p className="blogs__outside">
      <span className="blogs__outside-label">Outside work:</span>{' '}
      <a href={blogs.comic.url} target="_blank" rel="noopener noreferrer">
        {blogs.comic.name}<span className="sr-only"> (opens in a new tab)</span>
      </a>
      . A personal fan blog; characters belong to their owners.
    </p>
  )
}
