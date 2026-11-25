import { describe, expect, it } from 'vitest'
import * as data from './data.js'
import { emailLinks, SUBJECT } from './components/EmailButton.jsx'
import { namedBanks } from './test/bankMentions.js'

// Security review 2026-11-24: what the public bundle (and the public repo) reveal. Everything exported
// from data.js ships in dist/assets/index-*.js and can be read by anyone with "view source".
const all = JSON.stringify(data)

describe('private data stays out of the bundled data', () => {
  // FIXED (SEC-003, Medium, privacy; was a real bug): the owner asked to hide his availability (availability.public is
  // false, so nothing renders), but data.js still exports the details: open-to-work flag, notice period,
  // target roles, preferred location, work modes and relocation. They are in the production bundle
  // (verified: dist/assets/index-*.js contains public:!1 together with the notice and relocation values)
  // and in the public GitHub repo, where a scraper, a recruiter or his current employer can read them.
  // Fix: when public is false, export only { public: false } and keep the details out of the repo
  // (e.g. an untracked src/availability.local.js merged at build time, or simply delete them).
  it('availability details are not shipped while availability.public is false', () => {
    expect(data.availability.public).toBe(false)
    const shipped = Object.keys(data.availability).filter((k) => k !== 'public')
    expect(shipped).toEqual([])
  })

  it('has no phone number anywhere (10+ digits, optionally +, spaces, dots, dashes, brackets)', () => {
    const phones = (all.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?){2,4}\d{3,5}/g) || []).filter(
      (m) => m.replace(/\D/g, '').length >= 10,
    )
    expect(phones).toEqual([])
  })

  it('has no date of birth, age or street address fields', () => {
    expect(all).not.toMatch(/"(dob|dateOfBirth|birth\w*|age|address|street|pincode|zip|phone|mobile|tel)"\s*:/i)
    expect(all).not.toMatch(/\b(born on|date of birth)\b/i)
  })

  it('never names a bank other than "a global bank" (see src/test/bankMentions.js)', () => {
    expect(namedBanks(all)).toEqual([])
  })

  it('links nothing on a resume or PDF (the resume is not published)', () => {
    expect(all).not.toMatch(/resume\.pdf|\.pdf\b/i)
  })
})

describe('Email chooser links', () => {
  const links = emailLinks()

  it('web compose links are https on the expected hosts, with the address and subject encoded', () => {
    expect(new URL(links.gmail).origin).toBe('https://mail.google.com')
    expect(new URL(links.outlook).origin).toBe('https://outlook.live.com')
    expect(new URL(links.outlookWork).origin).toBe('https://outlook.office.com')
    for (const u of [links.gmail, links.outlook, links.outlookWork]) {
      expect(u).toContain(encodeURIComponent(SUBJECT))
      expect(u).not.toMatch(/[\s<>"]/)
    }
  })

  it('encodes hostile subjects so they cannot add parameters or headers', () => {
    const l = emailLinks('a@b.co', 'x&cc=evil@x.co\r\nBcc: evil@x.co')
    expect(l.mailto).toBe('mailto:a@b.co?subject=x%26cc%3Devil%40x.co%0D%0ABcc%3A%20evil%40x.co')
    expect(new URL(l.gmail).searchParams.get('cc')).toBeNull()
    expect(new URL(l.outlook).searchParams.get('cc')).toBeNull()
  })

  // The mailto: keeps the address unencoded (RFC 6068 allows "@"). Safe because the address is the
  // constant profile.email, never visitor input; if that ever changes, encode it as well.
  it('the shipped mailto: is exactly the profile address plus the subject', () => {
    expect(links.mailto).toBe(`mailto:${data.profile.email}?subject=${encodeURIComponent(SUBJECT)}`)
    expect(data.profile.email).toMatch(/^[\w.+-]+@[\w-]+\.[\w.-]+$/)
  })
})
