import { blogs } from '../data.js'
import BlogCard from './BlogCard.jsx'

// AndroidSuperNerds: Android UI tutorials.
export default function TechBlog() {
  return <BlogCard blog={blogs.tech} icon="🤖" variant="tech" cta="Read AndroidSuperNerds" />
}
