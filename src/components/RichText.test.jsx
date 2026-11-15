import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RichText from './RichText.jsx'

const rich = (text) => render(<RichText text={text} />).container.querySelector('.rich')

describe('RichText links', () => {
  it('opens web links in a new tab and says so', () => {
    rich('See [his LinkedIn](https://www.linkedin.com/in/x) for more.')
    const a = screen.getByRole('link', { name: /^his LinkedIn\s*\(opens in a new tab\)$/ })
    expect(a).toHaveAttribute('href', 'https://www.linkedin.com/in/x')
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps mailto links in the same tab', () => {
    rich('Write to [Vinod](mailto:a@b.co).')
    const a = screen.getByRole('link', { name: 'Vinod' })
    expect(a).toHaveAttribute('href', 'mailto:a@b.co')
    expect(a).not.toHaveAttribute('target')
  })

  it('links #section anchors in the page', () => {
    rich('[More in Experience](#experience)')
    const a = screen.getByRole('link', { name: 'More in Experience' })
    expect(a).toHaveAttribute('href', '#experience')
    expect(a).not.toHaveAttribute('target')
  })

  it.each([
    ['javascript:', '[click me](javascript:alert(1))'],
    ['JavaScript: with case', '[click me](JaVaScRiPt:alert(1))'],
    ['data:', '[click me](data:text/html;base64,PHNjcmlwdD4=)'],
    ['vbscript:', '[click me](vbscript:msgbox)'],
    ['a relative path', '[click me](/admin)'],
    ['protocol-relative', '[click me](//evil.example/x)'],
    ['file:', '[click me](file:///etc/passwd)'],
    ['an anchor with odd characters', '[click me](#a"onmouseover=x)'],
  ])('never makes a link from %s', (_, md) => {
    const el = rich(md)
    expect(within(el).queryByRole('link')).not.toBeInTheDocument()
    expect(el.querySelector('a')).toBeNull()
    expect(el).toHaveTextContent('click me')
  })

  it('never renders raw HTML', () => {
    const el = rich('<img src=x onerror=alert(1)> <script>alert(1)</script> **bold**')
    expect(el.querySelector('img, script')).toBeNull()
    expect(el).toHaveTextContent('<img src=x onerror=alert(1)>')
    expect(within(el).getByText('bold').tagName).toBe('STRONG')
  })

  it('links bare URLs without trailing punctuation, and bare emails', () => {
    rich('Visit https://www.example.com/vinod. Or mail a.b@c.io')
    expect(screen.getByRole('link', { name: /^example\.com\/vinod/ })).toHaveAttribute('href', 'https://www.example.com/vinod')
    expect(screen.getByRole('link', { name: 'a.b@c.io' })).toHaveAttribute('href', 'mailto:a.b@c.io')
  })

  it('shows a paragraph that is a single link as a button-style link', () => {
    rich('[Open LinkedIn profile ↗](https://www.linkedin.com/in/x)')
    expect(screen.getByRole('link', { name: /^Open LinkedIn profile ↗/ })).toHaveClass('btn', 'rich__cta')
  })
})

describe('RichText blocks', () => {
  it('renders lists, headings, code, bold and tables', () => {
    const el = rich('### Roles\n\n- **Accenture**: manager\n- HTC\n\n1. one\n2. two\n\n`code`\n\n| Year | Company |\n|---|---|\n| 2024 | Accenture |')
    expect(within(el).getByText('Roles').tagName).toBe('H5')
    const [ul, ol] = within(el).getAllByRole('list')
    expect(ul.tagName).toBe('UL')
    expect(ol.tagName).toBe('OL')
    expect(within(ul).getByText('Accenture').tagName).toBe('STRONG')
    const table = within(el).getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Year', 'Company'])
    expect(within(table).getByRole('cell', { name: 'Accenture' })).toBeInTheDocument()
  })

  it('shows images from the media catalogue only', () => {
    const el = rich('![Accenture](media:company/accenture)\n\n![Evil](https://evil.example/x.png)')
    expect(el).toHaveTextContent('Accenture')
    expect(el.querySelector('img[src^="https://evil"]')).toBeNull()
    expect(el).not.toHaveTextContent('Evil')
  })

  it('shows a placeholder for an unfinished chart while an answer streams in', () => {
    const el = rich('Here:\n\n```chart\n{"type":"bar"')
    expect(el).toHaveTextContent('Drawing chart…')
  })

  it('renders nothing for empty text', () => {
    expect(rich('')).toBeEmptyDOMElement()
  })
})
