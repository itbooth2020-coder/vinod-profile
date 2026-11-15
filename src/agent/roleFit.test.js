import { describe, expect, it } from 'vitest'
import { availabilityNote, fitSummaryText, matchRole, MAX_CHARS, MIN_WORDS, recaseAllCaps, SAMPLE_JD } from './roleFit.js'

// Filler that names no skills, so a JD clears MIN_WORDS without adding terms.
const PAD = ' We value clear communication, ownership, curiosity and a collaborative culture across all of our offices worldwide.'
const labels = (items) => items.map((x) => x.label)

describe('matchRole', () => {
  it('treats empty and whitespace-only input as too short', () => {
    for (const jd of ['', '   \n ', null, undefined]) {
      const r = matchRole(jd)
      expect(r.tooShort).toBe(true)
      expect(r.words).toBe(0)
      expect(r.strong).toEqual([])
    }
  })

  it(`needs at least ${MIN_WORDS} words`, () => {
    const short = Array.from({ length: MIN_WORDS - 1 }, () => 'Kotlin').join(' ')
    expect(matchRole(short).tooShort).toBe(true)
    expect(matchRole(`${short} Swift`).tooShort).toBe(false)
  })

  it('matches the sample JD with evidence from the profile', () => {
    const r = matchRole(SAMPLE_JD)
    expect(r.tooShort).toBe(false)
    expect(labels(r.strong)).toEqual(expect.arrayContaining(['Kotlin', 'Swift', 'React Native']))
    for (const m of r.strong) {
      expect(m.evidence.length).toBeGreaterThan(0)
      for (const e of m.evidence) expect(e).toEqual({ text: expect.any(String), where: expect.any(String) })
    }
    expect(r.leadership.signals).toEqual(expect.arrayContaining(['manage', 'hiring', 'mentoring', 'budget']))
  })

  it('gives no score, percentage or verdict', () => {
    const r = matchRole(SAMPLE_JD)
    expect(Object.keys(r)).not.toEqual(expect.arrayContaining(['score']))
    expect(Object.keys(r).some((k) => /score|percent|verdict|rating/i.test(k))).toBe(false)
    expect(r.summary).not.toMatch(/%|score|fit:|good|strong match|weak/i)
    expect(r.summary).toMatch(/requirements? matched with evidence · .*not evident in the profile/)
  })

  describe('word boundaries (no false positives)', () => {
    it('does not read "good" or "go further" as Go', () => {
      const r = matchRole('We need a good engineer to help a good team go further and write good JavaScript.' + PAD)
      expect(labels([...r.strong, ...r.gaps])).not.toContain('Go')
    })

    it('does not read JavaScript as Java', () => {
      const r = matchRole('Strong JavaScript skills for our web team are required for this position.' + PAD)
      expect(labels(r.strong)).toContain('JavaScript')
      expect(labels([...r.strong, ...r.gaps])).not.toContain('Java')
    })

    it('still finds Go and Java when they are named', () => {
      const r = matchRole('We need a backend engineer who writes Go and Java services with clean APIs.' + PAD)
      expect(labels(r.strong)).toContain('Java')
      expect(labels(r.gaps)).toContain('Go')
    })

    it('counts React Native once, not also as React', () => {
      const r = matchRole('Build our apps in React Native for both platforms.' + PAD)
      expect(labels(r.strong)).toContain('React Native')
      expect(labels(r.strong)).not.toContain('React')
    })
  })

  describe('ALL-CAPS job descriptions (FUNC-010)', () => {
    const CAPS =
      'WE ARE HIRING AN ENGINEERING MANAGER WITH STRONG SKILLS IN SWIFT, KOTLIN AND REACT NATIVE. ' +
      'YOU WILL GO THE EXTRA MILE AND REACT QUICKLY TO MAKE SWIFT DECISIONS FOR OUR CUSTOMERS EVERY SINGLE DAY OF THE WEEK.'

    it('recognises technology names in a list', () => {
      expect(labels(matchRole(CAPS).strong)).toEqual(expect.arrayContaining(['Swift', 'Kotlin', 'React Native']))
    })

    it('leaves ordinary capitalised words alone', () => {
      const text = recaseAllCaps(CAPS)
      expect(text).toMatch(/IN Swift, KOTLIN AND React NATIVE/)
      expect(text).toMatch(/GO THE EXTRA MILE AND REACT QUICKLY TO MAKE SWIFT DECISIONS/)
      expect(labels(matchRole(CAPS).gaps)).not.toContain('Go')
    })

    it('does nothing to mixed-case text', () => {
      const t = 'We use SWIFT payments and Go.'
      expect(recaseAllCaps(t)).toBe(t)
    })
  })

  it(`checks only the first ${MAX_CHARS.toLocaleString('en')} characters and says so`, () => {
    const long = 'Kotlin '.repeat(4000) + 'Kubernetes'
    expect(long.length).toBeGreaterThan(MAX_CHARS)
    const r = matchRole(long)
    expect(r.truncated).toBe(true)
    expect(labels([...r.strong, ...r.related, ...r.gaps])).not.toContain('Kubernetes')
    expect(matchRole(SAMPLE_JD).truncated).toBe(false)
  })

  it('stays fast on a maximum-length paste (FUNC-009)', () => {
    const big = (SAMPLE_JD + '\n').repeat(Math.ceil(MAX_CHARS / SAMPLE_JD.length) + 1)
    const t0 = performance.now()
    matchRole(big)
    expect(performance.now() - t0).toBeLessThan(2000)
  })

  describe('scale and seniority gaps', () => {
    it('lists years, team size and title beyond the profile, with both figures', () => {
      const r = matchRole('VP of Engineering\nYou will lead an organisation of 200 engineers. We need 20+ years of experience.' + PAD)
      expect(labels(r.scale)).toEqual(['20+ years of experience', 'Team of 200+', 'VP-level title'])
      expect(r.scale[0].note).toMatch(/asks for 20\+ years; the profile shows 14\+/)
      expect(r.scale[1].note).toMatch(/200\+ people; the profile shows teams of 20–50 engineers/)
      expect(r.summary).toMatch(/3 not evident in the profile/)
    })

    it('does not count "reports to the VP" as the role\'s title', () => {
      const r = matchRole('Engineering Manager\nThis role reports to the VP of Engineering and leads a team of 10 engineers.' + PAD)
      expect(r.scale).toEqual([])
    })

    it('does not flag requirements within the profile', () => {
      const r = matchRole('Engineering Manager\nWe need 10+ years of experience leading a team of 25 engineers.' + PAD)
      expect(r.scale).toEqual([])
    })

    it('ignores ages and "years ago"', () => {
      const r = matchRole('Engineering Manager\nOur company was founded 30 years ago and our CEO is 60 years old.' + PAD)
      expect(r.scale).toEqual([])
    })
  })

  // FUNC-016: an individual-contributor JD isn't shown as matched leadership requirements.
  describe('phrases that are not asked for', () => {
    const IC_JD =
      'We are hiring a Staff Backend Engineer to build microservices on AWS with Kubernetes and PostgreSQL. ' +
      'You will own on-call, SLOs and capacity planning for a payments platform. 8+ years of individual contributor experience. No people management.'
    const all = (r) => labels([...r.strong, ...r.related, ...r.gaps])

    it('skips negated requirements', () => {
      for (const jd of [
        'Staff engineer building payment APIs. No people management.',
        'Staff engineer building payment APIs without line management duties.',
        'Staff engineer building payment APIs. People management: not required.',
      ]) {
        const r = matchRole(jd + PAD)
        expect(all(r)).not.toContain('Engineering management')
        expect(r.leadership?.signals ?? []).not.toContain('manage')
        expect(labels(r.strong)).toContain('APIs')
      }
    })

    it('still counts "not only … but" and un-negated requirements', () => {
      const r = matchRole('You will not only write code but also own people management for a team of 8 engineers.' + PAD)
      expect(labels(r.strong)).toContain('Engineering management')
    })

    it('ignores recruiting boilerplate for Hiring, but not hiring as a duty', () => {
      expect(all(matchRole(IC_JD))).not.toContain('Hiring')
      expect(all(matchRole("We're hiring a mobile engineer to build Kotlin apps for our customers." + PAD))).not.toContain('Hiring')
      const duty = matchRole('We are hiring an Engineering Manager who will own hiring and mentoring for the team.' + PAD)
      expect(labels(duty.strong)).toContain('Hiring')
      expect(duty.leadership.signals).toContain('hiring')
    })

    it('reads capacity planning as its own term, not headcount planning', () => {
      const r = matchRole(IC_JD)
      expect(all(r)).toContain('Capacity planning')
      expect(all(r)).not.toContain('Headcount planning')
      expect(labels(matchRole('You will own resource planning and budgets for the engineering org.' + PAD).strong)).toContain('Headcount planning')
    })

    it('notes an individual-contributor role', () => {
      const r = matchRole(IC_JD)
      expect(labels(r.scale)).toContain('Individual-contributor role')
      expect(r.scale.find((s) => s.label === 'Individual-contributor role').note).toMatch(/people manager/)
      expect(r.leadership).toBeNull()
      expect(labels(matchRole('Engineering Manager\nThis is not an individual contributor role: you will lead a team of 10 engineers.' + PAD).scale)).toEqual([])
    })
  })
})

describe('fitSummaryText and availability', () => {
  it('has no availability line while availability is hidden', () => {
    expect(availabilityNote()).toBe('')
    expect(fitSummaryText(matchRole(SAMPLE_JD))).not.toMatch(/Availability|notice|relocation/i)
  })

  it('summarises the result in plain text with contact details', () => {
    const text = fitSummaryText(matchRole(SAMPLE_JD))
    expect(text).toMatch(/^Role fit notes for Vinod Pyarelal Yadav \(Custom Software Engineering Manager, Accenture\)/)
    expect(text).toMatch(/Matched with evidence:\n- /)
    expect(text).toMatch(/Contact: yadav\.vinod579@gmail\.com · https:\/\/www\.linkedin\.com/)
  })
})
