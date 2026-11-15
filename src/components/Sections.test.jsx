import { act, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import feeds from '../data/blogs.json'
import { learning, skills } from '../data.js'
import Skills from './Skills.jsx'
import Credentials from './Credentials.jsx'
import Blogs from './Blogs.jsx'
import Contact from './Contact.jsx'
import Footer from './Footer.jsx'

// Every link that opens a new tab must say so to screen readers and must not leak window.opener.
const NEW_TAB = /\(opens in a new tab\)|opens in a new tab\)/
const checkNewTab = (links) => {
  expect(links.length).toBeGreaterThan(0)
  for (const a of links) {
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    expect(a.querySelector('.sr-only')).toHaveTextContent(NEW_TAB)
    expect(a.getAttribute('href')).toMatch(/^https:\/\//)
  }
}
const externalLinks = (root) => within(root).getAllByRole('link').filter((a) => a.getAttribute('href').startsWith('http'))

describe('Skills', () => {
  it('leads with leadership and keeps "Earlier experience" collapsed', () => {
    const { container } = render(<Skills />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings[0]).toBe('Program Management')
    expect(headings.at(-1)).toBe('Earlier experience')
    const earlier = container.querySelector('details')
    expect(earlier).not.toHaveAttribute('open')
    expect(within(earlier.querySelector('summary')).getByRole('heading', { name: 'Earlier experience' })).toBeInTheDocument()
    expect(container.querySelectorAll('details')).toHaveLength(1)
  })

  it('lists every skill', () => {
    render(<Skills />)
    for (const s of skills) for (const item of s.items) expect(screen.getByText(item)).toBeInTheDocument()
  })

  it('prints the earlier skills in full', () => {
    const { container } = render(<Skills />)
    act(() => window.dispatchEvent(new Event('beforeprint')))
    expect(container.querySelector('details').open).toBe(true)
    act(() => window.dispatchEvent(new Event('afterprint')))
    expect(container.querySelector('details').open).toBe(false)
  })
})

describe('Credentials', () => {
  it('lists certifications, then courses in progress under "Currently learning"', () => {
    render(<Credentials />)
    const certs = screen.getByRole('heading', { name: 'Certifications', level: 3 }).closest('article')
    expect(within(certs).getByRole('heading', { name: 'Currently learning', level: 4 })).toBeInTheDocument()
    const [done, inProgress] = within(certs).getAllByRole('list')
    expect(done).toHaveTextContent('Claude Code AI Tools Certified')
    expect(within(inProgress).getAllByRole('listitem').map((li) => li.textContent)).toEqual(learning)
    expect(done).not.toHaveTextContent(/started/)
  })

  it('lists education and languages', () => {
    render(<Credentials />)
    expect(screen.getByRole('heading', { name: 'Education' }).closest('article')).toHaveTextContent('Master of Computer Applications')
    expect(screen.getByRole('heading', { name: 'Languages' }).closest('article')).toHaveTextContent('Marathi (Native)')
  })
})

describe('Blogs (Writing)', () => {
  it('shows the built-in tech posts without any request at runtime', () => {
    render(<Blogs />)
    expect(fetch).not.toHaveBeenCalled()
    const card = screen.getByRole('article', { name: 'AndroidSuperNerds' })
    const posts = feeds.blogs.tech
    expect(posts.length).toBeGreaterThan(0)
    for (const p of posts) expect(within(card).getByText(p.title)).toBeInTheDocument()
    checkNewTab(externalLinks(card))
  })

  it('uses local thumbnails only', () => {
    const { container } = render(<Blogs />)
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('src')).toMatch(/^\/blog-thumbs\//)
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveAttribute('loading', 'lazy')
    }
  })

  it('has the comic blog as an "Outside work" line with no posts, and a Privacy link', () => {
    render(<Blogs />)
    const region = screen.getByRole('region', { name: 'Writing' })
    expect(region).toHaveTextContent('Outside work:')
    const comic = within(region).getByRole('link', { name: /^Batman: The Legend/ })
    checkNewTab([comic])
    expect(screen.queryAllByRole('article')).toHaveLength(1)
    expect(within(region).getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy.html')
  })
})

describe('Contact', () => {
  it('offers email, LinkedIn and GitHub, external links in a new tab', () => {
    render(<Contact />)
    const region = screen.getByRole('region', { name: "Let's connect" })
    expect(within(region).getByRole('button', { name: 'yadav.vinod579@gmail.com' })).toHaveAttribute('aria-expanded', 'false')
    checkNewTab(externalLinks(region))
    expect(externalLinks(region)).toHaveLength(2)
  })

  it('shows no availability while it is hidden', () => {
    render(<Contact />)
    expect(screen.getByRole('region')).not.toHaveTextContent(/open to|notice period|relocation/i)
  })
})

describe('Footer', () => {
  it('opens the four profiles in a new tab and links the privacy page in the same tab', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    checkNewTab(externalLinks(footer))
    expect(externalLinks(footer)).toHaveLength(4)
    const privacy = within(footer).getByRole('link', { name: 'Privacy' })
    expect(privacy).toHaveAttribute('href', '/privacy.html')
    expect(privacy).not.toHaveAttribute('target')
  })

  it('shows this year and the offline assistant wording on the static site', () => {
    render(<Footer />)
    const footer = screen.getByRole('contentinfo')
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} Vinod Pyarelal Yadav`)
    expect(footer).toHaveTextContent('VINCE, the profile assistant, answers from the resume. Answers can contain mistakes')
    expect(footer).not.toHaveTextContent(/live agent/)
  })
})
