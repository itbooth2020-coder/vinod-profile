import { blogs } from '../data.js'
import BlogCard, { BlogIcon } from './BlogCard.jsx'

// Batman: The Legend: comic blog.
export default function ComicBlog() {
  return <BlogCard blog={blogs.comic} icon={<BlogIcon d="M4 5h16v11H10l-5 4v-4H4z" />} variant="comic" cta="Read Batman: The Legend" />
}
