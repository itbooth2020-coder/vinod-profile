import { beforeAll, describe, expect, it } from 'vitest'
import { matchRole, MAX_CHARS } from './roleFit.js'
import { answerLocally, ensureLexicon } from './localAgent.js'

// Security review 2026-11-24 (SEC-010): ReDoS. The role-fit box takes up to MAX_CHARS (20,000) characters
// and matches them on the main thread 300 ms after each edit (RoleFit.jsx), and VINCE's input takes 500.
// A regex with overlapping quantifiers can backtrack polynomially on long runs of spaces or digits and
// freeze the tab.
//
// Machines differ in speed, so the check is about growth, not a fixed time: the input is run at a quarter
// and at full size. Linear code takes about 4x as long; quadratic about 16x. A run counts as superlinear
// when the full-size run is slow enough to notice (over SLOW_MS) AND grew more than 8x.
const SLOW_MS = 250
const GROWTH = 8
const timed = (fn) => {
  const t0 = performance.now()
  fn()
  return performance.now() - t0
}
const growth = (run, make, size) => {
  run(make(size / 4)) // warm up (lexicon, regex compilation)
  const small = Math.max(timed(() => run(make(size / 4))), 0.5)
  const full = timed(() => run(make(size)))
  return { full: Math.round(full), ratio: Math.round((full / small) * 10) / 10 }
}
const expectLinear = ({ full, ratio }) =>
  expect(full > SLOW_MS && ratio > GROWTH, `full-size run ${full} ms, ${ratio}x the quarter-size run`).toBe(false)

// 20 words so matchRole doesn't stop at MIN_WORDS, then the pathological tail.
const WORDS = 'Engineering manager role leading mobile teams with Kotlin Swift React Native AWS cloud delivery agile scrum hiring mentoring stakeholders '
const tail = (unit, after = '') => (n) => (WORDS + unit.repeat(Math.ceil(n / unit.length))).slice(0, n - after.length) + after

const SAFE_SHAPES = {
  'many "1 " pairs (YEARS_RE start positions)': tail('1 '),
  '20k digits (\\d+ vs \\d{1,3}(?:,\\d{3})*)': tail('1'),
  'comma-grouped digits': tail('1,000'),
  '"team of " repeated': tail('team of '),
  'negations before terms (notAsked)': tail('not without no non '),
  'all caps lists (recaseAllCaps)': tail('REACT, SWIFT AND GO WITH NODE, '),
  'one 20k-letter word': tail('a'),
  'hyphenated term fragments ([\\s-]?)': tail('react-'),
  'long first line with titles (TITLES / report-to)': tail('reports to the '),
}

describe('role fit: no catastrophic backtracking on 20,000-character job descriptions', () => {
  it.each(Object.entries(SAFE_SHAPES))('%s', (_, make) => {
    expectLinear(growth(matchRole, make, MAX_CHARS))
  })

  // FIXED (SEC-010, Low; was a real bug): one digit followed by a long run of whitespace made YEARS_RE
  // ("\d{1,2}\s*(?:\+|plus)?\s*…"), TEAM_RES[0] ("\s*\+?\s*") and TEAM_RES[2] ("\s*\+?[\s-]*") backtrack
  // quadratically: measured ~0.46 s + 0.62 s + 0.41 s at 20,000 characters (4x per doubling), so the page
  // froze ~1.5 s after each edit. The quantifiers are now non-overlapping (roleFit.js): ~7 ms.
  it('a digit then 20,000 spaces (YEARS_RE / TEAM_RES overlapping \\s* quantifiers)', () => {
    expectLinear(growth(matchRole, (n) => (WORDS + '5' + ' '.repeat(n)).slice(0, n), MAX_CHARS))
  })

  it('SEC-010: 20,000 characters of a digit then whitespace match in well under 100 ms', () => {
    for (const ws of [' ', '\t', '\n']) {
      const jd = (WORDS + '5' + ws.repeat(MAX_CHARS)).slice(0, MAX_CHARS)
      matchRole(jd) // warm up
      expect(timed(() => matchRole(jd))).toBeLessThan(100)
    }
  })

  it('SEC-010: the rewritten patterns still read years and team sizes', () => {
    const scale = (jd) => matchRole(`${WORDS}\n${jd}`).scale.map((s) => s.label)
    expect(scale('20 plus years of experience')).toContain('20+ years of experience')
    expect(scale('18 -  25 + years of experience')).toEqual(expect.arrayContaining([expect.stringMatching(/years of experience/)]))
    expect(scale('Lead 200 +  engineers')).toContain('Team of 200+')
    expect(scale('Run a 300 + - person engineering org')).toContain('Team of 300+')
  })

  // Not affected: the hyphens break the whitespace runs, so only "[\s-]*" can take them.
  it('a digit then 20,000 " -" pairs (TEAM_RES[2] "\\s*\\+?[\\s-]*")', () => {
    expectLinear(growth(matchRole, (n) => (WORDS + '12' + ' -'.repeat(n)).slice(0, n), MAX_CHARS))
  })

  it('cuts anything longer than MAX_CHARS before matching (a pasted 1 MB JD costs the same as 20,000 characters)', () => {
    expect(matchRole(WORDS + 'x '.repeat(500_000)).truncated).toBe(true)
  })
})

describe('VINCE offline agent: no catastrophic backtracking on hostile questions', () => {
  beforeAll(() => ensureLexicon())

  // 500 is VoiceAssistant's maxLength; answerLocally itself has no cap, so 5,000 is checked too
  // (anything calling it directly, e.g. a future URL parameter, must not hang the page).
  const QUESTIONS = {
    'capitalised words (EMPLOYER / PARTNER / WORK_AT)': (n) => ('Did he work at ' + 'Acme '.repeat(n)).slice(0, n - 1) + '!',
    'is it + capitalised words (client guess)': (n) => ('Is it ' + 'Bank '.repeat(n)).slice(0, n - 2) + '?!',
    'figures and spaces (SCALE_FIGURE)': (n) => '1' + ' '.repeat(n - 2) + 'x',
    'dashes and spaces': (n) => '- '.repeat(n / 2),
    'pipes (table detection)': (n) => '|'.repeat(n),
    'one long word': (n) => 'a'.repeat(n),
    'markdown link spam': (n) => '[x](https://e.example/'.repeat(n).slice(0, n),
  }
  for (const n of [500, 5000]) {
    it.each(Object.entries(QUESTIONS))(`${n} chars: %s`, (_, make) => {
      expectLinear(growth((q) => answerLocally(q), make, n))
    })
  }
})
