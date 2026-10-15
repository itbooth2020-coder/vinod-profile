import { blogs } from '../data.js'
import BlogCard, { BlogIcon } from './BlogCard.jsx'

// AndroidSuperNerds: Android UI tutorials.
export default function TechBlog() {
  return <BlogCard blog={blogs.tech} icon={<BlogIcon d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />} variant="tech" cta="Read AndroidSuperNerds" />
}
