// Confidence tests for the offline profile agent (src/agent/localAgent.js), AI-003 option 2:
//   D. Table D regression: the 30 questions of the 17 Oct UAT re-test (docs/uat/04-ai-handling.md,
//      "Offline agent grading", table D), plus the four wordings its root-cause notes quote. Each
//      check is graded against src/data.js. All must pass: these were fixed through concepts.js and
//      generic intents (employers by city, project clients, numbers by topic), never by wording.
//   L. Low confidence: deliberately vague or odd questions must get the "not certain" reply (the
//      closest passages with "More in …" links, then three questions to try), never a confident
//      answer to a different question.
//   P. Patterns behind the confident-wrong answers of the 17 Oct (b) re-test, in our own wordings
//      (never the UAT's): a user/customer base is scale, not location; years resolve to the employers
//      of that time; a follow-up about "the team" or "the tech" uses the previous project or employer;
//      only comparisons with people get the "can't compare candidates" reply; interview scheduling is
//      an availability question.
//   S. Every question the assistants suggest is answered with confidence.
// Run with `npm run test:agent` (--verbose prints every answer); exits non-zero on any failure.
import { answerLocally, ensureLexicon } from '../src/agent/localAgent.js'
import { followUpPieces, nodeQuestions } from '../src/agent/vince.js'
import { graphDomains, graphProjects, suggestedPrompts } from '../src/data.js'

await ensureLexicon() // FUNC-015: the role-fit lexicon loads on demand

const has = (...patterns) => (a) => patterns.every((p) => p.test(a))
const lacks = (...patterns) => (a) => patterns.every((p) => !p.test(a))
const all = (...checks) => (a) => checks.every((c) => c(a))
const prose = (a) => a.replace(/```[\s\S]*?```/g, '').replace(/^\|.*$/gm, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
const lead = (n, re) => (a) => re.test(prose(a).trim().slice(0, n))
const sentences = (a) => prose(a).replace(/\[[^\]]*\]\([^)]*\)/g, '').trim().split(/(?<=[.!?])\s+(?=[A-Z*])/).filter((x) => x.trim()).length
const UNSURE = /^I'm not certain I understood\./
const sure = lacks(UNSURE, /couldn't find that/i)
// Owner decisions (Oct 2026): availability is hidden (data.js availability.public = false), the resume
// PDF isn't published, and no phone number is given.
const hiddenAvail = all(has(/please contact Vinod directly/, /mailto:/, /linkedin\.com/), lacks(/3 months|notice period is|relocation|Head of Engineering|\bCTO\b|Senior Engineering Manager|\bremote\b|hybrid|onsite/i))
const resumeOnRequest = all(has(/available on request/, /mailto:/, /linkedin\.com/), lacks(/resume\.pdf|download/i))

// [question or [earlier question, follow-up], check]
const TABLE_D = [
  ["What's his official designation at the moment?", all(sure, has(/Custom Software Engineering Manager/, /Accenture/))],
  ['Would a Head of Engineering opening be a stretch for him?', all(sure, has(/doesn't list a Director, VP/, /35\+ engineers/), lacks(/looking for/))],
  ['Does Vinod still get his hands dirty with code?', all(sure, lead(120, /people manager/), has(/doesn't say how much code he writes/))],
  ['Which company gave him his very first break?', all(sure, has(/Hurix/, /2011/))],
  ['Which firm did he leave to go to Accenture?', all(sure, lead(160, /Before Accenture/), has(/HTC Global Services/))],
  ['What was his title at Clean Bill of Health?', all(sure, has(/Android Developer/, /Clean Bill of Health/))],
  ['Did Vinod ever work in Mumbai, and for whom?', all(sure, has(/Xoriant/, /IT Gurus/, /Yesha/, /Hurix/), lacks(/Thakur|Ismail Yusuf/))],
  ['What did he deliver at Yesha IT Solutions?', all(sure, has(/order-processing/))],
  ['Any hands-on Jetpack Compose?', all(sure, has(/Jetpack Compose/), lacks(/doesn't mention/))],
  ['Has he programmed in C# or .NET?', all(has(/doesn't mention \*\*C# or \.NET\*\*/), lacks(UNSURE))],
  ['Is GraphQL part of his toolkit?', all(has(/doesn't mention \*\*GraphQL\*\*/), lacks(UNSURE))],
  ['Has he used Firebase?', all(sure, has(/Firebase/), lacks(/doesn't mention/))],
  ['If we made an offer today, how long until he could start?', hiddenAvail],
  ['Is he only interested in Bengaluru-based jobs?', hiddenAvail],
  ['Does he insist on working from the office?', hiddenAvail],
  ['Is Vinod currently entertaining offers?', all(hiddenAvail, lacks(/media:company/))],
  ['How many senior hires did he bring into the team?', all(sure, lead(200, /8 senior engineers/))],
  ['Has he been responsible for an engineering budget?', all(sure, has(/budget/, /35-engineer/))],
  ['How does he keep delivery quality high?', all(sure, has(/defects down 35%|Bug escape rate down 30%/))],
  ['Tell me about his approach to growing junior engineers', all(sure, lead(200, /Mentored 10\+|mentored 10\+/))],
  ['How much faster are releases thanks to him?', all(sure, lead(250, /3 weeks to 5 days/), lacks(/Meijer/))],
  ['By what percentage did he speed up device onboarding?', all(sure, lead(250, /40%/), lacks(/notice period|please contact Vinod directly/))],
  ['What role did AI play in the Syngenta work?', all(sure, has(/Darwin/, /Claude AI agents/), lacks(/looking for|please contact Vinod directly/))],
  ['Did he use AI coding assistants to write software?', all(sure, has(/Claude Code agents/), lacks(/AndroidSuperNerds|Batman/))],
  ['Can you share a number I can ring him on?', all(has(/don't share a phone number/, /mailto:/), lacks(/\+91|\d{5}\s?\d{5}/))],
  ["I'd like his CV as a file, please", resumeOnRequest],
  ['What is the short version of his background?', all(sure, has(/14\+ years/), (a) => sentences(a) <= 2)],
  ['Describe Vinod to my CEO in three lines', all(sure, has(/14\+ years/), (a) => sentences(a) <= 3)],
  [['What did he do at Xoriant?', 'And where did he go after that?'], all(sure, has(/3Cent Consultancy/))],
  [['Tell me about the PRESTO project', 'Who was the client?'], all(sure, has(/Metrolinx/))],
  // Quoted in the table-D root causes ("brevity plus a topic loses the topic", "a fact the agent can't reach").
  ['tl;dr of his AI work', all(sure, has(/Claude|Darwin|agent/), lacks(/results-driven/i), (a) => sentences(a) <= 1)],
  ['tl;dr of his leadership style', all(sure, has(/hiring|mentor|OKR/i), lacks(/results-driven/i))],
  ['Summarise his skills in one sentence', all(sure, has(/skills cover/, /AI & Agents/), lacks(/results-driven/i), (a) => sentences(a) <= 1)],
  ['Has he worked with Metrolinx?', all(sure, has(/PRESTO/, /Metrolinx/))],
]

const located = has(/based in \*\*Bengaluru/)
const refusesCompare = has(/can't rate or compare candidates/)
const PATTERNS = [
  // Scale, not location ("base" is not "based"); location still works with real location wording.
  ['How large is the customer base his products served?', all(sure, has(/30K\+ users/, /10,000\+/, /1M\+/), lacks(/Bengaluru/))],
  ['What install base did his device management work cover?', all(sure, has(/30K\+ users/, /10,000\+ enterprise devices/), lacks(/Bengaluru/))],
  ['Which city does Vinod live in?', all(sure, located)],
  ['Where exactly is he based these days?', all(sure, located)],
  // Years → the employers whose period overlaps them, oldest first; never the current job by default.
  ['Who employed him from 2013 to 2015?', all(sure, has(/IT Gurus/, /Xoriant/, /3Cent/, /Clean Bill of Health/), lacks(/Accenture|HTC/))],
  ['Which employers did he have during 2012?', all(sure, has(/Hurix/, /Yesha/, /IT Gurus/), lacks(/Accenture|Xoriant/))],
  ['What was Vinod doing in 2019?', all(sure, has(/HTC Global Services/, /Senior Consultant/), lacks(/Accenture/))],
  ['What job did he have back in 2009?', all(sure, has(/no job in 2009/, /MCA/, /Hurix/), lacks(/Accenture/))],
  ['Where does he work?', all(sure, has(/currently/, /Accenture/))],
  // Follow-ups about an aspect of the previous project or employer use that entity's own data.
  [['Tell me about the Meijer delivery project', 'What was the team size?'], all(sure, has(/10 members/, /Meijer/), lacks(/35\+|15–25|20–50/))],
  [['Describe the INTELITY work', 'How many people were in that team?'], all(sure, has(/12 members/, /INTELITY/), lacks(/35\+|15–25|20–50/))],
  [['What did he do at HTC?', 'How large was the team there?'], all(sure, has(/15–25 engineers/, /HTC/), lacks(/35\+/))],
  [['Tell me about the INTELITY platform', 'Which technologies did they rely on?'], all(sure, has(/INTELITY/, /Android/, /Jenkins/), lacks(/AI & Agents|skills cover/))],
  [['What did he do at Xoriant?', 'What tech did he use there?'], all(sure, has(/Xoriant/, /Node\.js/, /PHP/, /MySQL/))],
  // Comparing technologies is not comparing candidates; comparing him with people still is.
  ['Is React Native better than Flutter in his opinion?', all(has(/doesn't state a view/, /Flutter/, /React Native/), lacks(/can't rate or compare/))],
  ['Event-driven design versus REST APIs: where does he stand?', all(has(/doesn't state a view/), lacks(/can't rate or compare/))],
  ['Rank him against other candidates', refusesCompare],
  ['How does he compare with other engineering managers?', refusesCompare],
  // Setting up an interview or a call is availability (hidden: contact him directly), not his hiring.
  ['Is he free for a call next week?', hiddenAvail],
  ['Can we schedule an interview with Vinod?', hiddenAvail],
  ['How does he interview candidates?', all(sure, has(/hiring/i), lacks(/can't rate or compare|please contact Vinod directly/))],
]

// [question, a pattern the closest passages must match]
const LOW = [
  ['Tell me something interesting about devices and people', /devices/],
  ['What role did the transit cards play in his growth?', /smart card|Transit/],
  ['How does release planning relate to his mentoring?', /release planning|Mentored/],
  ['Is the portal thing still running?', /Darwin Portal/],
  ['Who paid for the warehouse stuff?', /warehouse/],
  ['Does the Bluetooth stuff connect to his hiring?', /Bluetooth|hiring/],
  ["What's his take on smart cards and morale?", /smart card/],
  ['Could the medicine reminders work for a whole team?', /medicine reminders/],
]
// The "not certain" format: the lead, 1–2 passages with "More in …" links, 3 questions to try, short.
const unsureFormat = (topic) => (a) => {
  const passages = (a.match(/^\*\*[^*]+\*\*: /gm) || []).length
  const tries = (a.split('You could ask:')[1] || '').match(/^- .+$/gm) || []
  return (
    UNSURE.test(a) &&
    /Here's what his profile says that seems closest:/.test(a) &&
    passages >= 1 && passages <= 2 &&
    /\[More in [^\]]+\]\(#[\w-]+\)/.test(a) &&
    tries.length === 3 &&
    topic.test(a.split('You could ask:')[0]) &&
    a.length <= 1100
  )
}

const verbose = process.argv.includes('--verbose')
const asHistory = (questions) => questions.flatMap((q) => [{ role: 'user', content: q }, { role: 'assistant', content: answerLocally(q) }])

function run(title, cases) {
  console.log(`\n${title}`)
  let pass = 0
  const failures = []
  cases.forEach(([q, check], i) => {
    const a = Array.isArray(q) ? answerLocally(q[1], asHistory([q[0]])) : answerLocally(q)
    const ok = check(a) && prose(a).length <= 1200
    if (ok) pass++
    else failures.push(i + 1)
    console.log(`${ok ? 'PASS' : 'FAIL'} ${String(i + 1).padStart(2)} ${Array.isArray(q) ? q.join(' → ') : q}  (${a.length} chars)`)
    if (verbose || !ok) console.log('     ' + a.replace(/\n/g, '\n     ').slice(0, 900))
  })
  return { pass, failures }
}

const d = run(`D. Table D regression (${TABLE_D.length})`, TABLE_D)
const pat = run(`P. Confident-wrong patterns (${PATTERNS.length})`, PATTERNS)
const low = run(`L. Low confidence (${LOW.length})`, LOW.map(([q, topic]) => [q, unsureFormat(topic)]))

// S. Every question the assistants suggest (suggested prompts, VINCE's follow-ups, the domain graph's
// questions) gets a confident answer: an unsure reply to our own suggestion would be a dead end.
const nodes = [
  ...graphProjects.flatMap((p) => [{ type: 'project', project: p }, ...p.tech.map((t) => ({ type: 'tech', label: t }))]),
  ...[...graphDomains, ...new Set(graphProjects.map((p) => p.vertical))].map((label) => ({ type: 'domain', label })),
]
const suggested = [...new Set([...suggestedPrompts, ...followUpPieces().questions, ...nodes.flatMap(nodeQuestions)])]
const dead = suggested.filter((q) => /^I'm not certain|couldn't find that/.test(answerLocally(q)))
console.log(`\nS. Suggested questions (${suggested.length}): ${dead.length ? `FAIL, unsure for: ${dead.join(' | ')}` : 'all answered'}`)

const line = (name, r, n) => `${name}: ${r.pass}/${n}${r.failures.length ? `; failed: ${r.failures.join(', ')}` : ''}`
console.log(`\n${line('Table D', d, TABLE_D.length)}\n${line('Patterns', pat, PATTERNS.length)}
${line('Low confidence', low, LOW.length)}\nSuggested: ${suggested.length - dead.length}/${suggested.length}`)
process.exit(d.pass === TABLE_D.length && pat.pass === PATTERNS.length && low.pass === LOW.length && !dead.length ? 0 : 1)
