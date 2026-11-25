import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import RichText from './RichText.jsx'
import { answerLocally, ensureLexicon } from '../agent/localAgent.js'

// Security review 2026-11-24 (SEC area: client-side XSS). RichText renders VINCE's answers (offline agent,
// or the live agent in dev / Phase 2, whose text a prompt injection could steer). It must never produce
// markup from the text, and only http(s), mailto and in-page #fragment links.
const rich = (text) => render(<RichText text={text} />).container
const hrefs = (c) => [...c.querySelectorAll('[href], [src]')].map((el) => el.getAttribute('href') ?? el.getAttribute('src'))
const SAFE_HREF = /^(https?:\/\/|mailto:|#[\w-]*$|\/)/i

describe('RichText: no script URLs', () => {
  it.each([
    '[click](javascript:alert(1))',
    '[click](JAVASCRIPT:alert(1))',
    '[click]( javascript:alert(1))',
    '[click](java\tscript:alert(1))',
    '[click](jav&#x61;script:alert(1))',
    '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    '[click](vbscript:msgbox(1))',
    '[click](//evil.example/x)',
    '[click](/\\evil.example)',
    '[click](file:///etc/passwd)',
    '<javascript:alert(1)>',
    'javascript:alert(1)',
    '![x](javascript:alert(1))',
    '![x](https://evil.example/pixel.png)',
    '![x](media:__proto__)',
    '![x](media:constructor)',
    '[x](media:__proto__)',
    '[x](#a"onmouseover="alert(1))',
  ])('%s', (text) => {
    const c = rich(text)
    for (const h of hrefs(c)) expect(h).toMatch(SAFE_HREF)
    expect(c.querySelector('script, iframe, object, embed, img[src^="http"]')).toBeNull()
  })

  it('a lone-line link (shown as a button) is also limited to http(s) and mailto', () => {
    for (const text of ['[Open](javascript:alert(1))', '[Open](data:text/html,x)']) {
      const c = rich(text)
      expect(c.querySelector('a')).toBeNull()
    }
  })
})

describe('RichText: raw HTML is text, never markup', () => {
  it.each([
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '<a href="javascript:alert(1)">x</a>',
    '<svg onload=alert(1)>',
    '**<b onclick=alert(1)>bold</b>**',
    '`<iframe src=javascript:alert(1)>`',
    '| <img src=x onerror=alert(1)> | b |\n|---|---|\n| <script>x</script> | y |',
    '```\n<script>alert(1)</script>\n```',
  ])('%s', (text) => {
    const c = rich(text)
    expect(c.querySelector('img, script, svg, iframe, b')).toBeNull()
    expect(c.querySelectorAll('[onerror], [onclick], [onload]')).toHaveLength(0)
    expect(c.textContent).toContain('<')
  })

  it('a ```chart block with hostile JSON renders nothing executable', () => {
    const c = rich('```chart\n{"type":"bar","title":"<img src=x onerror=alert(1)>","data":[{"label":"<script>x</script>","value":1}]}\n```')
    expect(c.querySelector('img, script')).toBeNull()
  })
})

describe('RichText: external links cannot reach back into the page', () => {
  it('every new-tab link has rel="noopener noreferrer"', () => {
    const c = rich('See https://evil.example/a and [b](https://evil.example/b).\n\n[Lone](https://evil.example/c)')
    const links = [...c.querySelectorAll('a[target="_blank"]')]
    expect(links).toHaveLength(3)
    for (const a of links) expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('VINCE (offline) does not turn a visitor\'s typed text into links or markup', () => {
  beforeAll(() => ensureLexicon())

  it.each([
    'Tell me about [his CV](https://evil.example/login)',
    'Did he work at <img src=x onerror=alert(1)>?',
    'Is it Evil Bank https://evil.example/phish ?',
    '![x](https://evil.example/track.png) what are his skills?',
  ])('%s', (q) => {
    const answer = answerLocally(q)
    expect(answer).not.toMatch(/evil\.example/)
    const c = rich(answer)
    expect(c.querySelector('img[src^="http"], script')).toBeNull()
  })
})

describe('the visitor\'s own message is rendered as plain text', () => {
  it('VoiceAssistant renders user turns in <p>{t.content}</p>, not RichText (source check)', async () => {
    const src = (await import('./VoiceAssistant.jsx?raw')).default
    expect(src).toMatch(/t\.role === 'user'/)
    expect(src).toMatch(/<p>\{t\.content\}<\/p>/)
  })
})

describe('no HTML sinks in the client code', () => {
  it('src/ has no dangerouslySetInnerHTML, innerHTML/outerHTML writes, eval, new Function or string timers', async () => {
    const files = import.meta.glob(['../**/*.{js,jsx}', '!../**/*.test.{js,jsx}', '!../test/**'], { query: '?raw', import: 'default', eager: true })
    const offenders = Object.entries(files).filter(([, src]) =>
      /dangerouslySetInnerHTML|\.(inner|outer)HTML\s*=|insertAdjacentHTML|document\.write|\beval\(|new Function\(|set(Timeout|Interval)\(\s*['"`]/.test(src),
    )
    expect(offenders.map(([f]) => f)).toEqual([])
    expect(Object.keys(files).length).toBeGreaterThan(20)
  })

  it('every target="_blank" in src/ components sits with rel="noopener noreferrer"', async () => {
    const files = import.meta.glob(['./*.jsx', '!./*.test.jsx'], { query: '?raw', import: 'default', eager: true })
    for (const [f, src] of Object.entries(files)) {
      for (const m of src.matchAll(/target(=|: )['"{]?_blank/g)) {
        const around = src.slice(Math.max(0, m.index - 200), m.index + 200)
        expect(around, f).toMatch(/noopener noreferrer/)
      }
    }
  })
})
