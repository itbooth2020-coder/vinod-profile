// Fresh-wording test for the offline profile agent (src/agent/localAgent.js), AI-003 round 3.
// 40 recruiter and hiring-manager questions, written for this round in wording not used in
// scripts/test-local-agent.mjs or the UAT tables, across every topic, each with a check graded
// against src/data.js. Target 34/40.
// Rule for this set: improve the agent's concepts and synonyms (src/agent/concepts.js), never code
// aimed at one of these strings, and don't edit a question or check to make it pass. Replace the set
// with new wording at the next UAT round; then it can join the regression suites.
// Run with `npm run test:agent` (--verbose prints every answer); exits non-zero below the target.
import { answerLocally } from '../src/agent/localAgent.js'

const TARGET = 34
const MAX_CHARS = 1200 // prose, without charts, tables and images (CHAT-003)

const has = (...patterns) => (a) => patterns.every((p) => p.test(a))
const lacks = (...patterns) => (a) => patterns.every((p) => !p.test(a))
const all = (...checks) => (a) => checks.every((c) => c(a))
const prose = (a) => a.replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
const lead = (n, re) => (a) => re.test(prose(a).trim().slice(0, n))
const sentences = (a) => prose(a).replace(/\[[^\]]*\]\([^)]*\)/g, '').trim().split(/(?<=[.!?])\s+(?=[A-Z*])/).filter((x) => x.trim()).length
const found = lacks(/couldn't find that/i)
const noNote = lacks(/doesn't mention/i)
const maxLen = (n) => (a) => a.length <= n
// Owner decisions (Oct 2026): availability is hidden (data.js availability.public = false) and the
// resume PDF isn't published (available on request).
const hiddenAvail = all(has(/please contact Vinod directly/, /mailto:/, /linkedin\.com/), lacks(/3 months|notice period is|relocation|Head of Engineering|\bCTO\b|Senior Engineering Manager|\bremote\b|hybrid|onsite/i))
const resumeOnRequest = all(has(/available on request/, /mailto:/, /linkedin\.com/), lacks(/resume\.pdf|download/i))

const FRESH = [
  // Role and level
  ['What does Vinod do for a living these days?', all(has(/Accenture/, /Custom Software Engineering Manager/), noNote)],
  ['Has he reached VP or head-of level?', all(has(/doesn't list a Director, VP/i, /Custom Software Engineering Manager/), found)],
  ['Is he willing to go abroad for work?', all(hiddenAvail, noNote)],
  // Career history
  ['Where did his career kick off?', all(lead(200, /Hurix/), has(/2011/), lacks(/media:company\/accenture/))],
  ['Who did he work for before Accenture?', all(has(/HTC Global Services/), lacks(/^!\[Accenture\]/))],
  ['What did he do at IT Gurus?', has(/IT Gurus/, /Android/, /NLP/)],
  ['How many years did he spend at Xoriant?', has(/Xoriant/, /Mar 2014 – Apr 2015/)],
  ['List every employer he has had', has(/Accenture/, /HTC Global Services/, /Yesha/, /Hurix/)],
  // Availability
  ['How long is his notice?', all(hiddenAvail, noNote)],
  ['Could he come on board in January?', all(hiddenAvail, lacks(/media:company/))],
  ['Is relocating to Singapore an option for him?', hiddenAvail],
  ['Does he want to work from home full-time?', all(hiddenAvail, noNote)],
  ['What sort of position is he after?', hiddenAvail],
  ['Is he on the job market right now?', hiddenAvail],
  // People leadership
  ['Does he coach junior developers?', lead(250, /Mentored 10\+|mentored 10\+/)],
  ['How does he keep good engineers from leaving?', lead(250, /attrition/i)],
  ['How big an org does he run?', has(/35\+/)],
  ['Does he run performance appraisals?', has(/performance reviews/i)],
  ['How many people did he recruit at Accenture?', has(/8 senior engineers/)],
  // Technology
  ['Is Kotlin one of his languages?', all(has(/Kotlin/), found, noNote)],
  ['Has he touched Kubernetes at all?', all(has(/doesn't mention \*\*Kubernetes\*\*/), lacks(/media:company/))],
  ['Can he code in Rust?', has(/doesn't mention \*\*Rust\*\*/)],
  ['Does he have Azure experience?', all(has(/Azure/), noNote)],
  ['What front-end frameworks does he use?', all(has(/React/), found)],
  ['Has he built anything with Bluetooth?', all(has(/Bluetooth/), found, noNote)],
  // AI
  ['Has he built AI agents in production?', all(has(/Claude/, /Darwin/), found)],
  ['How does he use prompt engineering?', all(has(/prompt/i, /few-shot|system prompts|guardrails/i), found)],
  ['Which large language models has he worked with?', all(has(/Claude/), noNote)],
  // Impact
  ['What was the release-cycle improvement?', has(/3 weeks/, /5 days/)],
  ['How many users have his products served?', has(/30K\+|5,000\+/)],
  ['How many contactless transactions did ATPS handle?', has(/1M\+/)],
  // Projects
  ['What was Meijer about?', has(/Meijer/, /last-mile/i)],
  ['Give me a rundown of his portfolio', all(has(/Darwin/, /#projects/), maxLen(800))],
  // Education and credentials
  ['What did he study at university?', has(/Master of Computer Applications|MCA/)],
  ['Is he Claude certified?', has(/Claude Code AI Tools Certified/)],
  // Contact and resume
  ['How do I email him?', has(/yadav\.vinod579@gmail\.com/)],
  ['Where can I download his résumé?', resumeOnRequest],
  // Short answers on any topic (CHAT-003)
  ['Sum Vinod up in a sentence', all(has(/14\+ years/), (a) => sentences(a) <= 1)],
  ['Give me the elevator pitch on Vinod', all(has(/Engineering Manager/, /35\+/), (a) => sentences(a) <= 2, found)],
  ['Briefly, what is his notice period?', all(hiddenAvail, (a) => sentences(a) <= 2, lacks(/^\|/m))],
]

const verbose = process.argv.includes('--verbose')
console.log('\nC. Fresh wording (40)')
let pass = 0
const failures = []
FRESH.forEach(([q, check], i) => {
  const a = answerLocally(q)
  const ok = check(a) && prose(a).length <= MAX_CHARS
  if (ok) pass++
  else failures.push(i + 1)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${String(i + 1).padStart(2)} ${q}  (${a.length} chars)`)
  if (verbose || !ok) console.log('     ' + a.replace(/\n/g, '\n     ').slice(0, 900))
})
console.log(`\nFresh: ${pass}/${FRESH.length} (target ${TARGET})${failures.length ? `; failed: ${failures.join(', ')}` : ''}`)
process.exit(pass >= TARGET ? 0 : 1)
