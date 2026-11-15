import { describe, expect, it } from 'vitest'
import { briefNarration, followUpLine, introduction, isUnsure, nextQuestions, markAsked, toSpeech, tourSteps } from './vince.js'
import { UNSURE } from './localAgent.js'

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length

describe('briefNarration (the 30-second brief)', () => {
  const steps = briefNarration()

  it('stays at about 75 spoken words (30 seconds)', () => {
    const spoken = steps.map((s) => s.speech).join(' ')
    expect(wordCount(spoken)).toBeLessThanOrEqual(80)
    expect(wordCount(steps.map((s) => s.text).join(' '))).toBeLessThanOrEqual(80)
  })

  it('says nothing about availability, notice, relocation or the resume', () => {
    for (const s of steps) {
      expect(s.target).not.toBe('availability')
      expect(`${s.text} ${s.speech}`).not.toMatch(/open to|notice|relocat|résumé|resume|download|Head of Engineering|\bCTO\b/i)
    }
  })

  it('targets only parts the brief marks with data-brief', () => {
    expect(steps.map((s) => s.target)).toEqual(['name', 'signals', 'stat-0', 'stat-1', 'stat-2', 'stat-3', 'projects', 'domains', 'actions'])
  })

  it('speaks numbers and acronyms as words', () => {
    const speech = steps.map((s) => s.speech).join(' ')
    expect(speech).toMatch(/thirty-five plus engineers led/)
    expect(speech).toMatch(/three weeks to five days/)
    expect(speech).not.toMatch(/→|\bwk\b/)
    expect(speech).toMatch(/I O T/)
  })
})

describe('tourSteps', () => {
  it('visits each section once, in page order', () => {
    expect(tourSteps().map((s) => s.target)).toEqual(['top', 'glance', 'lead', 'projects', 'experience', 'skills', 'credentials', 'blogs', 'contact'])
  })

  it('narrates from the data without placeholders', () => {
    for (const s of tourSteps()) {
      expect(s.text).not.toMatch(/undefined|NaN|\[object/)
      expect(s.text.length).toBeGreaterThan(20)
    }
  })

  it('leads the projects with the current bank program, with the right articles', () => {
    const text = tourSteps().find((s) => s.target === 'projects').text
    expect(text).toMatch(/Global Bank, an enterprise-wide program/)
    expect(text).toMatch(/Darwin Portal, an AI-powered/)
    expect(tourSteps().find((s) => s.target === 'glance').text).toMatch(/He is currently program-managing vulnerability remediation across ~3,000/)
  })

  it('CHAT-014: stays within 300 words; the At a glance stop points to the button and reads only its stats', () => {
    const steps = tourSteps()
    expect(steps.reduce((n, s) => n + s.text.trim().split(/\s+/).length, 0)).toBeLessThanOrEqual(300)
    const glance = steps.find((s) => s.target === 'glance').text
    expect(glance).toMatch(/^Press At a glance for his headline numbers: 35\+ engineers led, 100% on-time milestones, 3 weeks to 5 days release cycle and 8 senior engineers hired\./)
    expect(glance).not.toMatch(/30%\+|30K\+|5\+ concurrent/) // highlights inside the closed dialog aren't read
    const projects = steps.find((s) => s.target === 'projects').text
    expect(projects).not.toMatch(/a global bank's portfolio/) // "Global Bank, … a global bank's …" said twice
    expect(projects.split(/\s+/).length).toBeLessThanOrEqual(45)
  })

  it('does not narrate the collapsed Earlier experience skills', () => {
    const skills = tourSteps().find((s) => s.target === 'skills').text
    expect(skills).not.toMatch(/Earlier experience|Xamarin|jQuery|PHP/)
  })
  // That every target exists in the rendered page is checked in src/App.test.jsx.
})

describe('toSpeech', () => {
  it('speaks only the first sentence of a low-confidence answer', () => {
    const md = `${UNSURE} Here's what his profile says that seems closest:\n\n**Profile**: something long`
    expect(isUnsure(md)).toBe(true)
    expect(toSpeech(md)).toBe(`${UNSURE} The closest matches and links are on screen.`)
  })

  it('mentions charts, tables and images instead of reading them', () => {
    const md = 'Here it is.\n\n```chart\n{"title":"Team Size"}\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\n![Accenture](media:company/accenture)'
    const s = toSpeech(md)
    expect(s).toMatch(/I've put a chart of team size on screen/)
    expect(s).toMatch(/I've put a table of 2 rows on screen/)
    expect(s).not.toMatch(/media:|\||```/)
  })

  it('drops button links and says the links are on screen', () => {
    const s = toSpeech('Email him.\n\n[Email Vinod](mailto:a@b.c)\n\n[Open LinkedIn profile ↗](https://linkedin.com/x)')
    expect(s).toBe('Email him. The links are on screen.')
  })

  it('keeps inline link text and drops Markdown symbols', () => {
    expect(toSpeech('See **[Skills](#skills)** and `code`.')).toBe('See Skills and code.')
  })

  it('says dates, ranges and symbols as words', () => {
    expect(toSpeech('Accenture (Jun 2024 – Present).')).toBe('Accenture, since June 2024.')
    expect(toSpeech('HTC Oct 2016 – May 2024.')).toBe('HTC from October 2016 to May 2024.')
    expect(toSpeech('Teams of 20–50 engineers, 30K+ users, 3 wk → 5 days, CI/CD.')).toBe('Teams of 20 to 50 engineers, 30 thousand plus users, 3 weeks to 5 days, C I C D.')
  })

  it('pronounces resume as the noun', () => {
    expect(toSpeech('His resume is available on request.')).toBe('His résumé is available on request.')
  })

  it('cuts long answers at a sentence and points to the screen', () => {
    const md = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const s = toSpeech(md, 200)
    expect(s.length).toBeLessThanOrEqual(240)
    expect(s).toMatch(/here\. The full answer is on screen\.$/)
  })
})

describe('introduction, suggestions and follow-up lines', () => {
  it('says offline answers are a profile search', () => {
    expect(introduction('Good morning', { offline: true })).toMatch(/^Good morning\. I'm VINCE: .* I search his profile; for anything I can't find, contact Vinod\./)
    expect(introduction('Good evening')).toMatch(/I know his 14\+ years of work/)
  })

  it('suggests three different questions, none already asked, and none about availability', () => {
    const asked = new Set()
    markAsked(asked, 'Who is Vinod?')
    for (let i = 0; i < 20; i++) {
      const qs = nextQuestions('What did he do at HTC?', '', asked)
      expect(qs).toHaveLength(3)
      expect(new Set(qs).size).toBe(3)
      expect(qs).not.toContain('Who is Vinod?')
      expect(qs.join(' ')).not.toMatch(/notice period|open to new roles/i)
    }
  })

  it('builds a follow-up line from zero, one or two questions', () => {
    expect(followUpLine([])).toMatch(/anything else you'd like to know about Vinod\?$/)
    expect(followUpLine(['Who is Vinod?'])).toBe('You might also ask: Who is Vinod?')
    expect(followUpLine(['A?', 'B'], (a, b) => `${a}|${b}`)).toBe('A?|B.')
  })
})
