import { blogs } from '../data.js'
import BlogCard from './BlogCard.jsx'

// Batman: The Legend: comic blog.
export default function ComicBlog() {
  return <BlogCard blog={blogs.comic} icon="🦇" variant="comic" cta="Read Batman: The Legend" />
}
