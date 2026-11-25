// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkDist, phonesIn } from './check-dist.mjs'

// SEC-007: the release gate. Fixtures use made-up values only (555 numbers, a stand-in bank).
let dir
const site = (files) => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-dist-'))
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    writeFileSync(path.join(dir, name), body)
  }
  return dir
}
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

const CLEAN = {
  'index.html': '<p>Jun 2016 – Dec 2024 · ~3,000 apps · 30K+ users</p><svg><path d="M12 10.523 10.523 12.004 0 0 1 2.5z"/></svg>',
  'assets/index-abc123.js': 'e.flags&65011712;l|=1073741823;const s={public:!1};const c={notice:["notice","notice period"]};const t="tag:blogger.com,1999:blog-1234567890123.post-9876543210987";',
  'assets/index.css': '.a{color:#2563eb}',
  'robots.txt': 'User-agent: *',
}

describe('check-dist', () => {
  it('passes a clean site (dates, figures, React bit masks, SVG paths, blog ids)', () => {
    expect(checkDist(site(CLEAN), {})).toEqual([])
  })

  it.each([
    [{ 'resume.pdf': '%PDF-1.7' }, 'resume.pdf: forbidden file type'],
    [{ 'assets/index.js.map': '{}' }, 'assets/index.js.map: forbidden file type'],
    [{ 'assets/a.js': 'x()\n//# sourceMappingURL=a.js.map' }, 'assets/a.js: source map reference'],
    [{ 'assets/a.js': 'const p="Call +1 (555) 010-0199 today"' }, 'assets/a.js: phone-like number'],
    [{ 'index.html': '<p>Phone: +1 555 010 0199</p>' }, 'index.html: phone-like number'],
    [{ 'assets/a.js': 'const a={public:!1,open:!0,roles:["Head of X"],notice:"3 months",relocation:!0}' }, 'assets/a.js: availability details'],
    [{ 'data.json': '{"availability":{"public":false,"notice":"2 months"}}' }, 'data.json: availability details'],
    [{ 'index.html': '<p>3 months notice; open to relocation</p>' }, 'index.html: availability details'],
    [{ 'assets/a.js': 'const k="sk-ant-api03-abcdefghijklmnop"' }, 'assets/a.js: key-shaped secret'],
  ])('flags %j', (files, problem) => {
    expect(checkDist(site({ ...CLEAN, ...files }), {})).toContain(problem)
  })

  it('checks the client name only from CLIENT_NAME_PATTERN (never stored in the repo)', () => {
    const d = site({ ...CLEAN, 'index.html': '<p>TPM for Examplebank</p>' })
    expect(checkDist(d, {})).toEqual([])
    expect(checkDist(d, { CLIENT_NAME_PATTERN: 'Examplebank|Example Group' })).toEqual(['index.html: client name'])
    expect(checkDist(d, { CLIENT_NAME_PATTERN: '(' })).toEqual(['CLIENT_NAME_PATTERN: not a valid regular expression'])
  })

  it('phonesIn ignores ids, hashes and operators but finds spaced and bracketed numbers', () => {
    expect(phonesIn('post-9876543210987 abc1234567890 x&1234567890')).toEqual([])
    expect(phonesIn('call 555 010 0199 0 or (555) 010-0199')).toHaveLength(2)
  })
})
