import { beforeAll, describe, expect, it } from 'vitest'
import { answerLocally, ensureLexicon, explain, UNSURE } from './localAgent.js'
import { matchRole, fitSummaryText } from './roleFit.js'
import { isUnsure, nextQuestions, tourSteps } from './vince.js'
import { namedBanks } from '../test/bankMentions.js'

// Made-up and real bank names a visitor might type, in the wordings the UAT used (stand-ins, not the client).
const BANK_NAMES = ['Examplebank', 'Northwind Bank', 'Contoso Financial Group', 'HSBC']

// The current program (15 Nov 2026 resume sync, t15): application security & vulnerability remediation
// for a global bank, where Vinod is Technical Program Manager at Accenture. Owner decision: the client
// is named only as "a global bank"; its name must appear nowhere (namedBanks flags any named bank, and no
// form of the real name is written in the repo, SEC-001), and a named bank is neither confirmed nor denied. VINCE has no name-specific
// logic, so it's asked about stand-in banks (BANK_NAMES), and must not repeat those either.
const NEUTRAL = /described only as a global bank/
const CONFIRM_OR_DENY = /\b(yes|no|correct|confirm(ed|s)?|indeed|that's right|is not|isn't|wasn't|was not)\b/i
// The visitor's bank name, as typed, must not come back (TEST-003).
// String.raw: in a plain template literal "\b" is a backspace (U+0008), which made this check never match
// (found in the 15 Nov release run). The self-check test below keeps it honest.
const echoes = (answer, name) => new RegExp(String.raw`\b${name.split(' ')[0]}\b`, 'i').test(answer)
const WORKED = BANK_NAMES.flatMap((n) => [`has he worked with ${n}?`, `Did he work at ${n}?`, `Does he work for ${n}?`])
const CLIENT_IS = BANK_NAMES.flatMap((n) => [`Is his client ${n}?`, `Is the client ${n}?`])
const BANK_IS = BANK_NAMES.map((n) => `Is the bank ${n}?`)
const IT_IS = BANK_NAMES.map((n) => `Is it ${n}?`)
const nameIn = (q) => BANK_NAMES.find((n) => q.includes(n))

const converse = (...questions) => {
  const history = []
  let answer = ''
  for (const q of questions) {
    answer = answerLocally(q, history)
    history.push({ role: 'user', content: q }, { role: 'assistant', content: answer })
  }
  return answer
}

beforeAll(() => ensureLexicon())

it('self-check: echoes() finds a repeated name as a whole word, in any case', () => {
  expect(echoes("His profile doesn't mention **HSBC**.", 'HSBC')).toBe(true)
  expect(echoes('worked with northwind before', 'Northwind Bank')).toBe(true)
  expect(echoes('HSBCX', 'HSBC')).toBe(false)
  expect(echoes('described only as a global bank', 'Examplebank')).toBe(false)
})

describe('security and TPM answers', () => {
  it.each([
    'What application security work has he done?',
    'Tell me about the bank program',
    'Does he know OWASP and SAST?',
    'Has he done vulnerability remediation?',
    'Does he have AppSec experience?',
  ])('answers from the bank program and his Application Security skills: %s', (q) => {
    expect(explain(q)).toMatchObject({ intent: 'security', confident: true })
    const a = answerLocally(q)
    expect(a.startsWith(UNSURE)).toBe(false)
    expect(a).toMatch(/Technical Program Manager for a global bank's Application Security & Vulnerability Remediation Program/)
    expect(a).toMatch(/approximately 3,000 Android, iOS, and web applications/)
    expect(a).toMatch(/His Application Security skills: .*OWASP Top 10.*SAST, DAST, SCA/)
    expect(a).toMatch(/\[More in Projects\]\(#projects\)/)
  })

  it.each(['Is he a technical program manager?', 'Is he a TPM?', 'How does he run program governance?'])('answers TPM questions from his title, the program and his Program Management skills: %s', (q) => {
    expect(explain(q)).toMatchObject({ intent: 'program-management', confident: true })
    const a = answerLocally(q)
    expect(a).toMatch(/^His resume describes him as an \*\*Engineering Manager and Technical Program Manager\*\*/)
    expect(a).toMatch(/runs daily\/weekly governance and technical reviews/)
    expect(a).toMatch(/His Program Management skills: Technical Program Management, Program Governance/)
    expect(a).toMatch(/\[More in Experience\]\(#experience\)/)
  })

  it('says the resume gives no outcome figures for the program, rather than inventing any', () => {
    const a = answerLocally('What were the results of the bank program?')
    expect(a).toMatch(/The resume doesn't state outcome figures for this program\./)
    expect(a).toMatch(/tracked through leadership dashboards/)
    expect(a).not.toMatch(/\d+%/)
  })

  it("says the resume gives no start date for the program, only the Accenture role's", () => {
    expect(answerLocally('When did the bank program start?')).toMatch(/in his Accenture role \(since Jun 2024\); it doesn't give the program's own start date/)
  })

  it('a security question about another named project is not answered with the bank program', () => {
    expect(explain('Was PRESTO secure?').intent).not.toBe('security')
  })

  it('VINCE suggests the security questions after a role question, and they answer confidently', () => {
    const security = ['What application security work has he done?', 'Tell me about the bank program', 'Does he know OWASP and SAST?']
    for (let i = 0; i < 10; i++) {
      const qs = nextQuestions('What is his current role?')
      expect(qs.some((q) => security.includes(q)), qs.join(' | ')).toBe(true)
    }
    for (const q of [...security, 'Is he a technical program manager?']) expect(isUnsure(answerLocally(q)), q).toBe(false)
  })

  it("the tour's At a glance stop names the current program without naming the client", () => {
    const glance = tourSteps().find((s) => s.target === 'glance').text
    expect(glance).toMatch(/for a global bank\./)
    expect(namedBanks(glance)).toEqual([])
  })
})

describe('the client is "a global bank" (owner decision)', () => {
  it('the named-bank check passes "a global bank" and flags a named bank (self-check)', () => {
    expect(namedBanks('a global bank, Accenture, Syngenta, Global Bank – Application Security')).toEqual([])
    expect(namedBanks('He works with Northwind Bank and Contoso Financial Group.')).toEqual(['Northwind Bank', 'Contoso Financial Group'])
  })

  it('a client question gets CLIENT_NOTE and never echoes the typed name', () => {
    for (const n of BANK_NAMES) {
      const a = answerLocally(`Is the client ${n}?`)
      expect(a).toMatch(/Clients aren't always named on this site: the client of his current program is described only as a global bank\./)
      expect(a.toLowerCase()).not.toContain(n.toLowerCase())
    }
  })

  it.each(['Which bank is the client?', 'Who is the client of the bank program?', 'Which bank?', 'Which bank does he work with?', 'who is the client of the security program?'])(
    'names the client only as a global bank: %s',
    (q) => {
      const a = answerLocally(q)
      expect(a).toMatch(/a global bank/i)
      expect(namedBanks(a)).toEqual([])
      expect(a.startsWith(UNSURE)).toBe(false)
    },
  )

  it('a client follow-up on the bank program names "a global bank"', () => {
    expect(converse('What application security work has he done?', 'Who was the client?')).toMatch(/is \*\*a global bank\*\*/)
  })

  it.each(WORKED)('neither confirms nor denies a named bank: %s', (q) => {
    const a = answerLocally(q)
    expect(a).toMatch(NEUTRAL)
    expect(a).not.toMatch(/\byes\b|\bconfirm/i)
  })

  // TEST-003 (fixed 15 Nov): the answer used to repeat the visitor's bank name ("His profile doesn't mention
  // **<name>**", "His resume doesn't list **<name>** among his employers"), which put the name on screen and
  // read as a denial.
  it.each(WORKED)('TEST-003: does not repeat the bank name in its answer: %s', (q) => {
    const a = answerLocally(q)
    expect(echoes(a, nameIn(q))).toBe(false)
    expect(namedBanks(a)).toEqual([])
  })

  // TEST-004 (fixed 15 Nov): "Is the client <bank>?" got an unrelated HTC passage about "client engagements".
  it.each(CLIENT_IS)('TEST-004: "Is the client X?" gets the neutral note: %s', (q) => {
    const a = answerLocally(q)
    expect(a).toMatch(NEUTRAL)
    expect(a).not.toMatch(/HTC Global Services/)
  })

  // TEST-005 (fixed 15 Nov): "Is the bank X?" returned the generic program answer, without the neutral line.
  it.each(BANK_IS)('TEST-005: "Is the bank X?" gets the neutral note: %s', (q) => {
    expect(answerLocally(q)).toMatch(NEUTRAL)
  })

  it.each([...BANK_IS, ...CLIENT_IS, ...IT_IS, ...BANK_NAMES])('never confirms or denies a named bank, nor repeats its name: %s', (q) => {
    const a = answerLocally(q)
    expect(echoes(a, nameIn(q))).toBe(false)
    expect(namedBanks(a)).toEqual([])
    expect(a).not.toMatch(CONFIRM_OR_DENY)
  })
})

describe('client-name questions (AI-011, TEST-003 to TEST-005, 15 Nov fixes)', () => {
  it.each(['Which bank?', 'Name the bank please', "What's the name of the client?", ...CLIENT_IS, ...BANK_IS, ...IT_IS, ...WORKED])(
    'gives the neutral line, without repeating, confirming or denying a name: %s',
    (q) => {
      const a = answerLocally(q)
      expect(a).toMatch(NEUTRAL)
      if (nameIn(q)) expect(echoes(a, nameIn(q))).toBe(false)
      expect(namedBanks(a)).toEqual([])
      expect(a).not.toMatch(CONFIRM_OR_DENY)
      expect(a.startsWith(UNSURE)).toBe(false)
    },
  )

  it('names the program and offers more in a conversation for "Which bank?"', () => {
    const a = answerLocally('Which bank?')
    expect(explain('Which bank?')).toMatchObject({ intent: 'client-name', confident: true })
    expect(a).toMatch(/Technical Program Manager for a global bank's Application Security & Vulnerability Remediation Program\./)
    expect(a).toMatch(/can share more in a conversation/)
    expect(a).toMatch(/mailto:/)
  })

  it.each([
    ['Who was the client for Darwin?', /Syngenta/],
    ['Is the client Syngenta?', /Syngenta/],
    ['Who is the client for PRESTO?', /Metrolinx/],
  ])('still names the clients the profile names: %s', (q, re) => {
    expect(answerLocally(q)).toMatch(re)
    expect(explain(q).intent).not.toBe('client-name')
  })

  it('does not treat "Is it <a skill>?" as a client question', () => {
    expect(explain('Is it React?').intent).not.toBe('client-name')
  })
})

// AI-014 (fixed 15 Nov, release round): the name-first guesses and "what did he do at X" got an unrelated
// HTC passage or "I couldn't find that", which reads as a denial. Matched by the question's shape only.
describe('AI-014: name-first client guesses and "what did he do at X"', () => {
  const AI014 = BANK_NAMES.flatMap((n) => [
    `Was ${n} his client?`,
    `Is ${n} the client?`,
    `Was ${n} a client?`,
    `What did he do at ${n}?`,
    `What did Vinod do for ${n}?`,
    `Tell me about his ${n} work`,
  ])

  it.each(AI014)('gives the neutral line, never "couldn\'t find", and does not repeat the name: %s', (q) => {
    const a = answerLocally(q)
    expect(explain(q)).toMatchObject({ intent: 'client-name', confident: true })
    expect(a).toMatch(NEUTRAL)
    expect(a).not.toMatch(/couldn't find|HTC Global Services/)
    expect(echoes(a, nameIn(q))).toBe(false)
    expect(namedBanks(a)).toEqual([])
    expect(a).not.toMatch(CONFIRM_OR_DENY)
  })

  it.each([
    ['What did he do at Accenture?', /Accenture/],
    ['What did he do at HTC Global Services?', /HTC Global Services/],
    ['What did he do at Syngenta?', /Syngenta/],
    ['What did he do for Metrolinx?', /PRESTO/],
    ['Was Syngenta his client?', /Syngenta/],
    ['Was Metrolinx a client?', /Metrolinx/],
    ['Tell me about his PRESTO work', /PRESTO/],
    ['Tell me about his Android work', /Android/],
  ])('still answers for the employers, clients and work the profile names: %s', (q, re) => {
    expect(explain(q).intent).not.toBe('client-name')
    const a = answerLocally(q)
    expect(a).toMatch(re)
    expect(a).not.toMatch(NEUTRAL)
  })

  it('a technology the profile lacks keeps its own note, and "Hello?" is not a client guess', () => {
    expect(answerLocally('Tell me about his Kubernetes work')).toMatch(/doesn't mention \*\*Kubernetes\*\*/)
    expect(answerLocally('Hello?')).not.toMatch(NEUTRAL)
  })
})

describe('the current program in realistic questions (AI-012, AI-013)', () => {
  it('"How many apps…?" gives the program\'s application count', () => {
    expect(answerLocally('How many apps is he responsible for?')).toMatch(/His current program covers \*\*approximately 3,000 Android, iOS, and web applications\*\*/)
  })

  it('fintech is answered from Banking, saying that is the resume\'s word', () => {
    const a = answerLocally('Has he worked in fintech?')
    expect(a).toMatch(/The resume calls this work Banking/)
    expect(a).toMatch(/Global Bank/)
  })

  it.each([
    ['Does he have PCI DSS experience?', /His skills list \*\*PCI DSS awareness\*\*; the resume doesn't describe PCI DSS compliance/],
    ['Has he done pen testing himself?', /coordinating penetration testing .*it doesn't say he runs penetration tests himself/],
    ['Is he a security engineer?', /he is the \*\*Technical Program Manager\*\*; the resume doesn't describe hands-on security engineering/],
    ['How many vulnerabilities has he fixed?', /The resume doesn't give a count of vulnerabilities/],
  ])('qualifies the program answer: %s', (q, re) => {
    expect(answerLocally(q)).toMatch(re)
  })

  it.each(['Give me a 30 second pitch', 'Pitch him to me in 30 seconds', 'Give me a two minute elevator pitch'])('a timed pitch is the hero pitch, not a fragment: %s', (q) => {
    const a = answerLocally(q)
    expect(a).toMatch(/^Vinod is an Engineering Manager and Technical Program Manager leading a 35\+ engineer/)
    expect(a).not.toMatch(/^Proven track record/)
  })

  it('notes a certification his profile does not mention', () => {
    expect(answerLocally('Does he have a CISSP?')).toMatch(/doesn't mention \*\*CISSP\*\*/)
  })
})

describe('no date of birth, age or phone in VINCE answers', () => {
  it.each(['How old is he?', 'What is his date of birth?', 'When was he born?', 'What is his age?'])('%s', (q) => {
    expect(answerLocally(q)).toBe("His age and date of birth aren't shared.")
  })

  it.each(["What's his phone number?", 'Can I call him?', 'Give me his mobile number'])('%s', (q) => {
    const a = answerLocally(q)
    expect(a).toMatch(/don't share a phone number/)
    expect(a.replace(/\D/g, ' ')).not.toMatch(/\d{10}/)
    expect(a).not.toMatch(/tel:/)
  })
})

describe('role fit on an application security TPM job description', () => {
  const JD = `Technical Program Manager, Application Security
We are hiring a Technical Program Manager to lead our application security and vulnerability remediation program across a large portfolio of mobile and web applications at a global bank.
Responsibilities: run program governance and weekly status reporting; own remediation SLAs and KPIs on leadership dashboards; coordinate SAST, DAST and SCA findings with engineering teams; prioritize vulnerabilities by severity using OWASP Top 10 and OWASP MASVS; coordinate penetration testing and rescans; manage risk and dependency management across workstreams; partner with stakeholders in banking and financial services.
Requirements: 10+ years experience, TPM background, DevSecOps and secure coding knowledge, PCI DSS awareness, TLS, Agile/Scrum, experience with Checkmarx or Veracode.`
  const labels = (items) => items.map((x) => x.label)

  it('matches the AppSec and TPM requirements with evidence from the bank program', () => {
    const r = matchRole(JD)
    expect(r.tooShort).toBe(false)
    expect(labels(r.strong)).toEqual(
      expect.arrayContaining(['Technical program management', 'Vulnerability management', 'OWASP', 'SAST', 'DAST', 'SCA', 'DevSecOps', 'Secure coding', 'TLS', 'Program governance', 'SLAs', 'KPIs', 'Dashboards', 'Banking']),
    )
    // FUNC-017: the resume has PCI DSS "awareness" and penetration test "coordination" only: related, not matched.
    expect(labels(r.strong)).not.toContain('PCI DSS')
    expect(labels(r.strong)).not.toContain('Penetration testing')
    const tpm = r.strong.find((m) => m.label === 'Technical program management')
    expect(tpm.evidence[0]).toEqual({ text: expect.stringMatching(/^Serves as Technical Program Manager for a global bank's/), where: 'Accenture · Jun 2024 – Present' })
    expect(r.gaps).toEqual([])
    expect(r.scale).toEqual([])
  })

  it('FUNC-017: shows PCI DSS (awareness) and penetration testing (coordination) as related, with the honest evidence', () => {
    const r = matchRole(JD)
    expect(r.related.find((m) => m.label === 'PCI DSS')).toMatchObject({ note: 'awareness only', evidence: [{ text: expect.stringMatching(/PCI DSS awareness/), where: 'Technical skills' }] })
    const pen = r.related.find((m) => m.label === 'Penetration testing')
    expect(pen.note).toBe('coordination only')
    expect(pen.evidence.map((e) => e.text).join(' ')).toMatch(/drives closure with QA, penetration testing|penetration testing teams|Penetration Test Coordination/)
    expect(fitSummaryText(r)).toMatch(/- PCI DSS: in the profile as awareness only/)
    expect(fitSummaryText(r)).toMatch(/- Penetration testing: in the profile as coordination only/)
  })

  it('FUNC-017: a PCI-compliance JD gets PCI DSS as related and the QSA audits as not evident', () => {
    const r = matchRole(
      'Security Compliance Lead. You will own PCI DSS compliance across our payments platform and lead the company through PCI DSS Level 1 certification. Work with engineering to remediate findings, run QSA audits, maintain policies and evidence, and report to leadership monthly.',
    )
    expect(labels(r.strong)).not.toContain('PCI DSS')
    expect(labels(r.related)).toContain('PCI DSS')
    expect(labels(r.gaps)).toContain('PCI QSA')
  })

  it('TEST-006: lists the security certifications a JD asks for as not evident, and matches the one he holds', () => {
    const r = matchRole(
      `${JD}\nCISSP or OSCP required; CISM, CEH, CSSLP, CompTIA Security+ or a PCI QSA a plus. PMP, PgMP or Certified ScrumMaster preferred. A Claude Code certification is a bonus.`,
    )
    expect(labels(r.gaps)).toEqual(expect.arrayContaining(['CISSP', 'OSCP', 'CISM', 'CEH', 'CSSLP', 'Security+', 'PCI QSA', 'PMP', 'PgMP', 'CSM']))
    const held = r.strong.find((m) => m.label === 'Claude Code certification')
    expect(held.evidence).toEqual([{ text: expect.stringMatching(/^Claude Code AI Tools Certified/), where: 'Certifications' }])
    expect(r.summary).toMatch(/\d+ not evident in the profile/)
  })

  it('shows named tools it has no evidence for as related to the practice, not as matches', () => {
    const r = matchRole(JD)
    expect(labels(r.strong)).not.toContain('Checkmarx')
    expect(r.related.find((m) => m.label === 'Checkmarx')).toMatchObject({ via: ['SAST'] })
    expect(r.related.find((m) => m.label === 'Veracode').via).toEqual(expect.arrayContaining(['SAST']))
  })

  it('never names the client in its evidence or copied summary', () => {
    const r = matchRole(JD)
    expect(namedBanks(JSON.stringify(r))).toEqual([])
    expect(namedBanks(fitSummaryText(r))).toEqual([])
    expect(fitSummaryText(r)).toMatch(/Technical program management/)
  })

  // TEST-006 (fixed 15 Nov): common AppSec / TPM certifications in a JD (CISSP, PMP, CISM…) were not in the
  // role-fit lexicon, so they were neither matched nor listed as "not evident in the profile".
  it('TEST-006: lists a requested certification he does not hold (CISSP, PMP) as not evident', () => {
    const r = matchRole(`${JD}\nCISSP or PMP certification preferred.`)
    expect(labels(r.gaps)).toEqual(expect.arrayContaining(['CISSP', 'PMP']))
  })
})
