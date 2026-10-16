// Offline fallback agent: a catalogue of intents scored by concept (concepts.js maps synonyms and
// word forms to concepts, so new wordings still match), rich answers (images, tables, charts) for
// common requests, then keyword retrieval over the resume data in src/data.js, answered with the
// best two or three sentences rather than whole entries.
// Used when the live Claude agent (/api/ask) isn't available, e.g. on static hosting.
// Answers use the same Markdown subset as the live agent (see components/RichText.jsx).
// Regression tests: scripts/test-local-agent.mjs and scripts/test-local-agent-fresh.mjs (npm run test:agent).
import { profile, profileCard, stats, availability, showAvailability, leadership, highlights, experience, projects, graphProjects, otherProjects, skills, certifications, learning, education, languages, blogs, suggestedPrompts } from '../data.js'
import { LEXICON } from './fitLexicon.js'
import { conceptsOf, brevity } from './concepts.js'

const FIRST = profile.firstName.split(' ')[0]
const YEARS = profile.tagline.match(/\d+\+?/)[0] // e.g. '14+'
const CARD = Object.fromEntries(profileCard)

// Words that carry no topic. "used", "worked", "know" and "experience" are here so that in
// "Has he used Kubernetes?" only the technology counts.
const STOP = new Set((
  'a an the and or of to in on for with by at is are was were be been being has have had do does did doing done ' +
  'he his him vinod yadav pyarelal what which who whom whose how why when where tell me about can could would will ' +
  'shall should may might you your please give list any some there their it its this that these those from as into ' +
  'than then i we us our my also just ever really much very used use uses using worked work works working know knows ' +
  'knew experience experienced'
).split(' '))

const SYNONYMS = {
  job: 'role current accenture',
  stack: 'skills technologies',
  tech: 'skills technologies',
  technologies: 'skills',
  ai: 'agents claude copilotkit darwin generative prompt',
  llm: 'generative ai claude agents',
  llms: 'generative ai claude agents',
  genai: 'generative ai claude agents',
  gpt: 'generative ai claude',
  chatgpt: 'generative ai claude',
  prompt: 'prompt engineering few shot guardrails darwin',
  prompts: 'prompt engineering few shot guardrails darwin',
  agentic: 'agents claude code darwin',
  sdk: 'claude agent',
  mdm: 'device management emm',
  iot: 'devices connected sensor',
  contact: 'email linkedin github facebook twitter x social reach',
  reach: 'contact email',
  study: 'education degree',
  studied: 'education degree',
  degree: 'education',
  college: 'education',
  certified: 'certifications',
  certificate: 'certifications',
  team: 'engineers led leadership',
  lead: 'leadership led team',
  leadership: 'team engineers led okrs hiring mentoring',
  located: 'location bengaluru',
  live: 'location bengaluru',
  healthcare: 'health medicine hipaa',
  recruit: 'hiring', recruited: 'hiring', recruiting: 'hiring', hire: 'hiring', hired: 'hiring',
  coach: 'mentored', coaching: 'mentored', coached: 'mentored', mentor: 'mentored', mentoring: 'mentored',
  retention: 'attrition', retain: 'attrition', turnover: 'attrition',
  appraisal: 'performance reviews', appraisals: 'performance reviews',
  org: 'team engineers', organisation: 'team engineers', organization: 'team engineers',
}

const tokenize = (s) =>
  s.toLowerCase()
    .replace(/\b(front|back)[\s-]end\b/g, '$1end') // "front-end" is the "Frontend" skill area
    .replace(/[^a-z0-9+#./ ]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[./]+|[./]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))

const sentencesOf = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).filter(Boolean)
const lowerFirst = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
// The words a skill group is searched by. The "Earlier experience" group goes by "earlier legacy", so
// a question with "experience" in it doesn't pull in the whole group.
// 'Leadership' is left out of 'Leadership & Methodologies', so leadership questions reach How he leads.
const skillWords = (s) => (s.earlier ? 'earlier legacy older' : s.area.replace(/^Leadership & /, ''))
const areaName = (s) => (s.earlier ? 'earlier-career' : s.area) // "his earlier-career skills"
const list = (items, and = 'and') => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`)

// Sections a passage can point to for more.
const SECTIONS = { '#experience': 'Experience', '#projects': 'Projects', '#lead': 'How he leads', '#impact': 'Impact', '#skills': 'Skills', '#credentials': 'Credentials', '#contact': 'Contact' }
const more = (href) => (SECTIONS[href] ? `\n\n[More in ${SECTIONS[href]}](${href})` : '')

// Searchable passages. `source` labels a passage in the answer; `sentences` are ranked one by one.
const chunks = [
  { title: 'Who is Vinod summary overview introduce', sentences: sentencesOf(profile.summary) },
  {
    title: 'Current role job accenture',
    leadFirst: true,
    source: `${profile.company} · ${experience[0].period}`,
    sentences: [`${profile.name} is currently ${profile.role} at ${profile.company}, based in ${profile.location}.`, ...experience[0].points.slice(0, 3)],
    media: experience[0].media,
    label: profile.company,
    href: '#experience',
  },
  { title: 'Impact highlights achievements', source: 'Impact', sentences: highlights.map((h) => `${h.title}: ${h.text}.`), href: '#impact' },
  { title: 'Leadership management style hiring mentoring delivery quality budget stakeholders', source: 'How he leads', sentences: leadership.map((l) => `${l.title}: ${l.points.join('; ')}.`), href: '#lead' },
  ...experience.map((e, i) => ({
    title: `${e.company} ${e.role} experience career history`,
    source: `${e.company} · ${e.role} · ${e.period}`,
    sentences: e.points,
    media: e.media,
    label: e.company,
    href: '#experience',
    company: i,
  })),
  ...projects.map((p) => ({
    title: `${p.name} ${p.tag} project`,
    leadFirst: true,
    source: `${p.name} (${p.tag})`,
    // Case-study approach points add detail the short card text doesn't have (e.g. Darwin's prompt engineering).
    sentences: [...sentencesOf(p.text), ...(p.caseStudy?.approach || []).filter((a) => !p.text.includes(a))],
    media: p.media,
    label: p.name,
    href: '#projects',
  })),
  { title: 'Other notable projects portfolio', sentences: [`Other notable projects: ${otherProjects.join(', ')}.`], href: '#projects' },
  ...skills.map((s) => ({ title: `${skillWords(s)} skills technologies stack`, sentences: [`${s.earlier ? 'Earlier in his career' : s.area}: ${s.items.join(', ')}.`], href: '#skills', skill: true })),
  { title: 'Certifications courses learning', sentences: [`Certifications: ${certifications.join('; ')}.`, `Currently learning: ${learning.join('; ')}.`], href: '#credentials' },
  { title: 'Education degree college university', sentences: [`Education: ${education.join('; ')}.`], href: '#credentials' },
  { title: 'Languages spoken', sentences: [`Languages: ${languages.join(', ')}.`] },
  { title: 'Contact email linkedin github facebook twitter x social reach location', sentences: [`You can reach ${FIRST} by email at ${profile.email} or on LinkedIn: ${profile.linkedin}.`, `He is based in ${profile.location}.`], href: '#contact' },
].map((c) => ({ ...c, text: c.sentences.join(' '), titleTokens: new Set(tokenize(c.title)) })).map((c) => ({ ...c, textTokens: tokenize(c.text) }))

// Every word the profile uses, for telling "not in his profile" apart from "not understood".
const stem = (w) => (w.length > 4 ? w.replace(/(ies|es|s|ed|ing)$/, '') : w)
// A question word matches a profile word exactly, as a prefix ("architect" → "architected"), or by
// stem ("payments" → "payment").
const matches = (w, t) => w === t || (t.length > 3 && (w.startsWith(t) || stem(w) === stem(t)))
// Words too general to pick out one skill item ("stakeholder management" isn't "Context Management").
const GENERIC_SKILL_WORDS = new Set(['management', 'engineering', 'development', 'design', 'integration', 'analysis', 'tools', 'frameworks', 'systems'])
const VOCAB = new Set(
  [...chunks.flatMap((c) => [...c.titleTokens, ...c.textTokens]), ...tokenize(JSON.stringify([graphProjects, availability, profile, profileCard, blogs]))].map(stem),
)
// Words that can sit next to a missing term without the question being about anything else.
const GENERIC = new Set((
  'hands on familiar proficient comfortable good strong expert skilled solid deep exposure background knowledge ' +
  'expertise skill skills tool tools tech done held hold holds own owned lead led manage managed handled handle ' +
  'built build shipped ship delivered deliver created create made make run ran implemented implement written write ' +
  'got get been go mentor mentored hire hired earned completed studied open ok okay willing able ready interested ' +
  'available fully actively currently still kind sort type lot lots well people team teams year years time project ' +
  'projects app apps move relocate join start other others ones one'
).split(' '))

// "His profile doesn't mention X" is only said for technology, domain or qualification terms that the
// question names and the profile never uses (AI-003): the role-fit lexicon (fitLexicon.js), matched
// with its own case rules, so "Go or Rust" is about languages but "go abroad" isn't, plus common
// terms it doesn't list. Ordinary words ("first", "next", "abroad", "individual") never are.
const NOTE_CATS = new Set(['Languages', 'Mobile', 'Web', 'Backend', 'Data', 'Cloud', 'DevOps', 'AI/ML', 'IoT', 'Devices', 'Education', 'Domain'])
const EXTRA_TOPICS = (
  'mba phd doctorate startup startups crisis blockchain web3 crypto solidity ethereum jira confluence figma ' +
  'selenium appium cypress jest junit espresso hadoop hive unity cobol perl haskell elixir erlang clojure lua ' +
  'matlab sas sharepoint servicenow shopify magento wordpress drupal laravel symfony nestjs nuxt gatsby bootstrap ' +
  'tailwind webgl threejs opengl cuda pandas numpy scikit keras langchain llamaindex pinecone gemini mistral ' +
  'openshift heroku vercel netlify cloudflare nginx apache tomcat weblogic websphere sap abap cissp pmp itil ' +
  'togaf prince2 csm aws gcp banking'
).split(' ').concat(['deep learning', 'neural network', 'data science', 'reinforcement learning'])
const PROFILE_RAW = JSON.stringify([profile, experience, projects, graphProjects, otherProjects, skills, certifications, learning, education, highlights, leadership])
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
// Same word-boundary rules as the role-fit matcher (roleFit.js): spaces match spaces or hyphens,
// a plural 's'/'es' is allowed, and '+' or '#' can't follow ('C++', 'C#').
const termRe = (term, cs) => {
  const body = escapeRe(term).replace(/\\-/g, '[\\s-]?').replace(/ +/g, '[\\s-]+')
  const plural = /[a-z]$/i.test(term) && term.length > 2 ? '(?:e?s)?' : ''
  return new RegExp(`(?<![A-Za-z0-9])${body}${plural}(?![A-Za-z0-9+#])`, cs ? 'g' : 'gi')
}
const inProfile = (re) => ((re.lastIndex = 0), re.test(PROFILE_RAW))
// Never noted: Claude is an LLM, and the machine-learning intent explains his model-training work.
const COVERED = new Set(['LLMs', 'Machine learning'])
const MISSING_TERMS = [
  ...LEXICON.filter((e) => NOTE_CATS.has(e.cat) && !COVERED.has(e.label)).map((e) => {
    const res = [e.re ? new RegExp(e.re, e.cs ? 'g' : 'gi') : termRe(e.label, e.cs), ...(e.aliases || []).map((a) => termRe(a, false)), ...(e.exact || []).map((a) => termRe(a, true))]
    // An English-word name ('Rust', 'Dart') also counts in a lower-case question; 'Go', 'C' and 'R' don't.
    if (e.cs && !e.re && e.label.length > 2) res.push(termRe(e.label, false))
    return { res, evidenced: [...res, ...(e.also || []).map((a) => termRe(a, false))].some(inProfile) }
  }),
  ...EXTRA_TOPICS.map((t) => ({ res: [termRe(t, false)], evidenced: inProfile(termRe(t, false)) || VOCAB.has(stem(t)) })),
].filter((t) => !t.evidenced)

// The missing terms a question names, as it spells them, longest first and without overlaps.
function missingIn(question) {
  const spans = []
  for (const t of MISSING_TERMS) {
    for (const re of t.res) {
      re.lastIndex = 0
      for (const m of question.matchAll(re)) spans.push({ start: m.index, end: m.index + m[0].length, text: m[0] })
    }
  }
  spans.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
  const kept = []
  for (const s of spans) if (!kept.some((k) => s.start < k.end && k.start < s.end)) kept.push(s)
  return [...new Map(kept.sort((a, b) => a.start - b.start).map((s) => [s.text.toLowerCase(), s.text])).values()]
}

// Companies by every name a visitor might use: "HTC", "Infosys", "3Cent", "Xoriant", "IT Gurus"…
const LEGAL = /\b(pvt|ltd|private|limited|inc|llc|solutions|systems|software|services|global|consultancy)\b\.?/g
const COMPANY_ALIASES = experience.map((e) => {
  const name = e.company.toLowerCase()
  const main = name.replace(/\(.*?\)/g, ' ').replace(LEGAL, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim()
  const first = name.split(/[\s(]/)[0]
  const aliases = [name.replace(/[().,]/g, '').replace(/\s+/g, ' '), main, name.match(/\((.*?)\)/)?.[1], first.length > 2 && !STOP.has(first) && first !== 'clean' ? first : null]
  return [...new Set(aliases.filter(Boolean))]
})
const COMPANY_RES = COMPANY_ALIASES.map((a) => new RegExp(`(^|[^a-z0-9])(${a.map(escapeRe).join('|')})($|[^a-z0-9])`))
const companiesIn = (q) => COMPANY_RES.flatMap((re, i) => (re.test(q) ? [i] : []))
const COMPANY_WORDS = new Set(COMPANY_ALIASES.flat().flatMap((a) => tokenize(a)))
const YES_NO = /^(has|have|does|did|is|was|can|could|would|will|any)\b/

// Markdown helpers
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const ym = (s) => {
  const m = s.trim().match(/^(\w{3})\w*\s+(\d{4})$/)
  return m ? `${m[2]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}` : 'present'
}
const chart = (spec) => '```chart\n' + JSON.stringify(spec) + '\n```'
const table = (head, rows) =>
  [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n')
const img = (id, caption = '') => `![${caption}](media:${id})`
const bullets = (items) => items.map((i) => `- ${i}`).join('\n')
const email = () => `[Email ${FIRST}](mailto:${profile.email})`
const statLine = (s) => `**${s.sr || s.value}** ${lowerFirst(s.label)}`

const PROJECT_NAMES = /\b(darwin|syngenta|presto|metrolinx|vusion|vusiongroup|meijer|meta|facebook|qculous|intelity|bayer|elder|clinic)\b/
const ROLE_NAMES = new RegExp(`\\b(${availability.roles.map((r) => r.toLowerCase()).join('|')})s?\\b`)

// Verticals from the domain graph, with the words visitors use for them.
const VERTICAL_WORDS = { Healthcare: 'health ?care|medical|pharma|hospital', 'Agri-Tech': 'agri\\w*|agriculture|farming', Transit: 'transit|transport\\w*|transit payments?', Retail: 'retail|grocery', Hospitality: 'hospitality|hotels?', 'Enterprise Mobility': 'enterprise mobility' }
const VERTICALS = [...new Set(graphProjects.map((p) => p.vertical))]
const verticalIn = (q) => VERTICALS.find((v) => new RegExp(`\\b(${VERTICAL_WORDS[v] || v.toLowerCase()})\\b`).test(q))

const PROGRAMMING = ['Kotlin', 'Java', 'Swift', 'JavaScript', 'TypeScript', 'Python', 'PHP'].filter((l) =>
  new RegExp(`\\b${l}\\b`).test(skills.flatMap((s) => s.items).join(' ')),
)

const strengths = (n = 6) => [
  `**${YEARS} years** in software engineering; now ${profile.role} at ${profile.company}`,
  ...stats.map(statLine),
  ...highlights.slice(1, 1 + Math.max(0, n - 1 - stats.length)).map((h) => h.text),
]

// "worked at Google": a capitalised name after "worked at/for" (known employers are answered earlier).
const EMPLOYER = /\b(?:worked|works|work|been) (?:at|for) ((?:[A-Z][\w&.-]*)(?: [A-Z][\w&.-]*)*)/

// Galleries and tables stay short in chat (CHAT-003): at most MAX_ITEMS, then "+N more".
const MAX_ITEMS = 6
const gallery = (items, max = MAX_ITEMS) =>
  items.slice(0, max).map(([id, caption]) => img(id, caption)).join(' ') + (items.length > max ? `\n\n+${items.length - max} more` : '')
const cappedTable = (head, rows, rest, max = MAX_ITEMS) =>
  table(head, rows.slice(0, max)) + (rows.length > max ? `\n\n+${rows.length - max} more ${rest}` : '')

// "What was his role at HTC?", "What did he do at Xoriant?": that employer's entry, opening with the
// role and dates, then the bullets that best match the question (the first bullet otherwise).
function companyAnswer(i, question) {
  const e = experience[i]
  const work = projects.filter((p) => p.caseStudy?.company === e.company)
  if (/\bprojects?\b/i.test(question) && work.length) {
    return `At ${e.company}, his projects include:\n\n${bullets(work.map((p) => `**${p.name}**: ${sentencesOf(p.text)[0]}`))}` + more('#projects')
  }
  const terms = new Set(
    tokenize(question)
      .filter((t) => !COMPANY_WORDS.has(t) && !['role', 'roles', 'title', 'position', 'there', 'time'].includes(t))
      .flatMap((t) => [t, ...tokenize(SYNONYMS[t] || '')].filter((w) => !COMPANY_WORDS.has(w))),
  )
  const score = (p) => tokenize(p).reduce((n, w) => n + ([...terms].some((t) => matches(w, t)) ? 1 : 0), 0)
  const ranked = e.points.map((p, j) => ({ p, j, n: score(p) })).sort((a, b) => b.n - a.n || a.j - b.j)
  const picked = ranked[0].n ? ranked.filter((r) => r.n >= ranked[0].n * 0.6).slice(0, 2).sort((a, b) => a.j - b.j) : [ranked.find((r) => r.j === 0)]
  const when = e.current ? `since ${e.period.split('–')[0].trim()}` : e.period
  return (
    img(e.media, e.company) +
    `\n\nAt **${e.company}** (${e.location}, ${when}), ${FIRST} ${e.current ? 'is' : 'was'} **${e.role}**. ` +
    picked.map((r, k) => (k ? r.p : `There, he ${lowerFirst(r.p)}`)).join(' ') +
    more('#experience')
  )
}

// Intent catalogue (AI-003). Each intent is scored by the concepts the question carries (concepts.js
// maps synonyms and word forms to them): `concepts` gives each one's weight, `require` lists concepts
// of which at least one must be present, `not` lists concepts that rule the intent out, and `boost`
// adds evidence that isn't a concept (a named employer, project or vertical). The best intent scoring
// at least `min` (default 3) answers; on a tie the earlier one wins. With no intent, the question goes
// to skill matching, then to retrieval over the resume passages, then to an honest "couldn't find".
// A note on missing technology ("His profile doesn't mention Go or Rust") goes before the answer
// unless the intent sets note: false.
// ctx: { q: lower-case question, question: as typed, has: Set of concepts, brief: sentences wanted (0 = any) }
const named = (q) => PROJECT_NAMES.test(q)
const has = (ctx, ...c) => c.some((x) => ctx.has.has(x))
const lineOf = (e, p) => `At ${e.company}, he ${lowerFirst(p)}`
const pointsWhere = (re) => experience.flatMap((e) => e.points.filter((p) => re.test(p)).map((p) => ({ e, p })))
const article = (s) => (/^[AEIOU]/i.test(s) ? 'an' : 'a')

const INTENTS = [
  {
    id: 'injection',
    // Prompt injection: this agent has no instructions to reveal, and nothing to override.
    boost: ({ q }) => (/\b(ignore|disregard|forget)\b.*\b(rules|instructions|prompt|above)\b|\b(print|show|reveal|repeat|tell me) (me )?(your|the) (system )?(prompt|instructions|rules)\b/.test(q) ? 10 : 0),
    note: false,
    answer: () => `I can't do that. I'm a search over ${FIRST}'s resume and profile on this page, so I can only answer questions about his experience, projects and skills.`,
  },
  {
    // Owner decision: his age and date of birth are never shared, by either assistant.
    id: 'age',
    concepts: { age: 7 },
    note: false,
    answer: () => `His age and date of birth aren't shared.`,
  },
  {
    id: 'personal',
    concepts: { personal: 6 },
    note: false,
    answer: () => `His resume doesn't cover personal details like that; I can only answer questions about his work.`,
  },
  {
    id: 'salary',
    concepts: { salary: 6 },
    note: false,
    answer: () => `His profile doesn't include salary expectations; that's best discussed with ${FIRST} directly.\n\n${email()}`,
  },
  {
    // "Can I get his resume?", "Download CV", but not "What does his resume say about…?" The PDF
    // isn't published on the site (owner decision): it's available on request.
    id: 'resume',
    concepts: { resume: 5 },
    not: ['resumeSays'],
    note: false,
    answer: () =>
      `${FIRST}'s resume is available on request: email him or connect on LinkedIn.\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`,
  },
  {
    // "Why is he leaving Accenture?", "What's his reason for a change?": the profile gives no reasons.
    id: 'why-leave',
    concepts: { whyLeave: 7 },
    note: false,
    answer: () =>
      `His profile doesn't state his reasons for looking for a new role, so that's best asked of ${FIRST} directly. ` +
      (showAvailability ? `What it does say: he is open to ${list(availability.roles, 'or')} roles, and his notice period is ${availability.notice}.` : '') +
      `\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`,
  },
  {
    // Neither assistant ever gives a phone number (AI-004, owner decision); point to email and LinkedIn.
    id: 'phone',
    concepts: { phone: 6 },
    note: false,
    answer: () => `I don't share a phone number here. The best way to reach ${FIRST} is email or LinkedIn.\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`,
  },
  {
    // "Rate him as a CTO candidate", "Compare him with a typical EM": no opinions, just the evidence.
    id: 'compare',
    concepts: { compare: 5 },
    note: false,
    answer: ({ q }) => {
      const role = q.match(ROLE_NAMES) && availability.roles.find((r) => r.toLowerCase() === q.match(ROLE_NAMES)[1])
      return (
        `I can't rate or compare candidates, but here is what his profile shows:\n\n${bullets(strengths(4))}\n\n` +
        (role && showAvailability ? `He is open to ${role} roles. ` : '') +
        `To check him against a specific job, paste it into the role-fit checker.\n\n[Check role fit](#fit)`
      )
    },
  },
  {
    // A named employer ("What was his role at HTC?"): that company's entry, never the current job's.
    // Projects ("What did he build for Syngenta?") and "which companies…" lists are answered elsewhere.
    id: 'company',
    boost: ({ q }) => (companiesIn(q).length && !named(q) && !/\b(compan(y|ies)|employers)\b.*\b(worked|has he|did he)\b|\bwhich compan/.test(q) ? 5 : 0),
    answer: ({ q }) => companiesIn(q).slice(0, 2).map((i) => companyAnswer(i, q)).join('\n\n'),
  },
  {
    // "Is he a people manager or an individual contributor?", "Does he still code?"
    id: 'people-manager',
    concepts: { ic: 6 },
    answer: () => {
      const darwin = experience[0].points.find((p) => /Darwin/.test(p))
      return (
        `He is a people manager: as ${profile.role} at ${profile.company}, he manages a team of **35+ engineers** across Android, iOS and web, ` +
        `owns the engineering budget for that org, and runs OKRs and performance reviews. His resume also lists architecture work, for example: ${lowerFirst(darwin)} ` +
        `It doesn't say how much code he writes himself.` +
        more('#lead')
      )
    },
  },
  {
    // "Is he a tech lead?": his lead and manager titles, not the skills table ("tech" is a skill word).
    id: 'tech-lead',
    concepts: { techLead: 5 },
    answer: () => {
      const lead = experience.find((e) => /\blead\b/i.test(e.role))
      const point = lead?.points.find((p) => /teams? of/i.test(p))
      return (
        `${FIRST} is now **${profile.role}** at ${profile.company}, managing a team of 35+ engineers.` +
        (lead ? ` Before that he was **${lead.role}** at ${lead.company} (${lead.period})${point ? `: ${lowerFirst(point)}` : '.'}` : '') +
        more('#experience')
      )
    },
  },
  {
    // "Has he done any machine learning?": the resume's model-training skill and Darwin's prediction models.
    id: 'machine-learning',
    concepts: { ml: 5 },
    note: false,
    answer: () => {
      const area = skills.find((s) => s.items.some((i) => /model training/i.test(i)))
      const item = area?.items.find((i) => /model training/i.test(i))
      const work = experience.find((e) => e.points.some((p) => /prediction models/i.test(p)))
      const point = work?.points.find((p) => /prediction models/i.test(p))
      return (
        (item ? `His ${area.area} skills include **${item}**. ` : '') +
        (point ? `At ${work.company}, for Syngenta's Darwin Portal, he ${lowerFirst(point.replace(/^Used /, 'used '))}` : '') +
        `\n\nThe resume doesn't name specific machine-learning frameworks.` +
        more('#projects')
      )
    },
  },
  {
    // "Why should we hire him?", "What makes him stand out?", "What are his strengths?"
    id: 'why-hire',
    concepts: { whyHire: 6 },
    answer: ({ q }) =>
      `${/strength/.test(q) ? 'His resume points to these strengths' : `Here's the short case for ${FIRST}, from his resume`}:\n\n${bullets(strengths())}\n\n` +
      `To check him against a specific job, paste it into the role-fit checker.\n\n[Check role fit](#fit)`,
  },
  {
    // "How many years of experience?", "How long has he been in the industry?"
    id: 'years',
    concepts: { years: 4 },
    answer: () =>
      `${FIRST} has **${YEARS} years** of experience, starting in ${experience.at(-1).period.match(/\d{4}/)[0]}. ` +
      `He is now ${profile.role} at ${profile.company}, and has ${lowerFirst(highlights[0].text)}.` +
      (showAvailability ? ` He is looking for ${list(availability.roles, 'or')} roles.` : '') +
      more('#experience'),
  },
  {
    // "Is he at director level yet?", "How senior is he?", "What seniority would suit him?": his title,
    // scope and target roles as the resume states them, never a level it doesn't.
    id: 'level',
    concepts: { level: 4, directorQ: 1 },
    answer: (ctx) =>
      (has(ctx, 'directorQ') ? `His resume doesn't list a Director, VP or executive title. ` : '') +
      `${FIRST}'s current title is **${profile.role}** at ${profile.company}, where he manages a team of **35+ engineers** and owns the engineering budget for that org. ` +
      `He has **${YEARS} years** of experience and has ${lowerFirst(highlights[0].text)}.` +
      (showAvailability ? ` He is looking for ${list(availability.roles, 'or')} roles.` : '') +
      more('#experience'),
  },
  {
    // "Biggest team he has managed?", "How large are the teams he has led?", "Does he manage managers?"
    id: 'team-size',
    concepts: { teamSize: 4, managers: 4 },
    not: ['mentor', 'hire'],
    answer: (ctx) =>
      (has(ctx, 'managers') ? `His resume doesn't say whether he manages other managers. ` : '') +
      `${FIRST} has ${lowerFirst(highlights[0].text)}. At ${profile.company} he manages a team of **35+ engineers** across Android, iOS and web, ` +
      `and owns the engineering budget for that 35-engineer org. At HTC Global Services he led teams of 15–25 engineers.` +
      more('#lead'),
  },
  {
    // Hiring, mentoring, attrition, OKRs and reviews: the resume bullets that answer the question first,
    // then his "Hiring & growth" points. Not "hire him" (that's contact).
    id: 'people',
    concepts: { mentor: 4, hire: 4, attrition: 4, okr: 4 },
    not: ['hireHim'],
    answer: (ctx) => {
      const asked = [has(ctx, 'mentor') && /mentor/i, has(ctx, 'hire') && /hiring|hired|recruit/i, has(ctx, 'attrition') && /attrition|retention/i, has(ctx, 'okr') && /OKR|performance review/i].filter(Boolean)
      const lead = pointsWhere({ test: (p) => asked.some((re) => re.test(p)) }).slice(0, 2).map(({ e, p }) => lineOf(e, p))
      const group = leadership.find((l) => /hiring/i.test(l.title)) || leadership[0]
      return (
        (lead.length ? `${lead.join(' ')}\n\n` : '') +
        `On ${group.title.replace(' & ', ' and ').toLowerCase()}, his resume lists:\n\n${bullets(group.points)}` +
        (has(ctx, 'hire') && /interview|recruit|hir/.test(ctx.q) ? `\n\nIt doesn't describe his interview process.` : '') +
        more('#lead')
      )
    },
  },
  {
    id: 'certifications',
    concepts: { certs: 4 },
    // Completed certifications, then the courses the resume lists as in progress (UX-007).
    answer: () =>
      `${FIRST} holds ${certifications.length === 1 ? 'this certification' : 'these certifications'}:\n\n${bullets(certifications)}` +
      (learning.length ? `\n\nHe is currently learning:\n\n${bullets(learning)}` : '') +
      more('#credentials'),
  },
  {
    id: 'budget',
    concepts: { budget: 4 },
    answer: ({ q }) => {
      const group = leadership.find((l) => /budget/i.test(l.title))
      const htc = experience[1].points.find((p) => /budget/i.test(p))
      return (
        `Yes, ${FIRST} has owned engineering budgets:\n\n${bullets([...(group?.points || []).filter((p) => /budget|cost/i.test(p)), ...(htc ? [`At ${experience[1].company}: ${lowerFirst(htc)}`] : [])])}` +
        (/p\s?&\s?l|p and l|profit/.test(q) ? `\n\nThe resume describes engineering budget ownership; it doesn't mention P&L responsibility.` : '') +
        more('#lead')
      )
    },
  },
  {
    // "Is he a fit for this role?": point to the role-fit checker (components/RoleFit.jsx).
    id: 'role-fit',
    concepts: { fit: 3, career: 1 },
    require: ['fit'],
    answer: () =>
      `Paste the job description into the role-fit checker. It lists the requirements ${FIRST}'s experience covers, with evidence from his roles and projects, and what isn't evident in the profile. It runs in your browser.\n\n[Check role fit](#fit)`,
  },
  {
    // "What was his first job?", "Where did he begin his career?": the oldest experience entry.
    id: 'first-job',
    concepts: { first: 3, career: 2 },
    require: ['first'],
    min: 5,
    answer: () => {
      const e = experience.at(-1)
      return (
        img(e.media, e.company) +
        `\n\n${FIRST}'s first role on his resume is **${e.role}** at **${e.company}**, ${e.location} (${e.period}). There, he ${lowerFirst(e.points[0])} ` +
        `Since then he has worked at ${experience.length - 1} more companies, up to ${profile.role} at ${profile.company}.` +
        more('#experience')
      )
    },
  },
  {
    // "Who did he work for before Accenture?", "Where did he go after Xoriant?": the neighbouring entry.
    id: 'adjacent-company',
    boost: ({ q }) => (companiesIn(q).length === 1 && /\b(before|prior to|preceding|after|following|next|left)\b/.test(q) && !named(q) ? 6 : 0),
    answer: ({ q }) => {
      const i = companiesIn(q)[0]
      const before = /\b(before|prior to|preceding)\b/.test(q)
      const j = before ? i + 1 : i - 1
      const c = experience[i].company
      if (j >= experience.length) return `${c} was his first role on the resume (${experience[i].period}).` + more('#experience')
      if (j < 0) return `${c} is his current employer (${experience[i].period}).` + more('#experience')
      return describeCompany(j, before ? `Before ${c}, he was ` : `After ${c}, he became `)
    },
  },
  {
    // "What was his previous job?": the entry before the current one.
    id: 'previous-job',
    concepts: { previous: 3, career: 2 },
    require: ['previous'],
    min: 5,
    answer: () => describeCompany(1, `Before ${experience[0].company}, he was `),
  },
  {
    // Open to work, notice period and start date, relocation, work modes and target roles: one
    // availability answer that leads with what was asked.
    id: 'availability',
    concepts: { start: 3, notice: 4, available: 3, open: 3, relocate: 4, workmode: 4, target: 3 },
    not: ['pastStart'],
    answer: (ctx) => {
      const { q } = ctx
      // Hidden on the site (data.js availability.public): no notice period, places, work modes or titles.
      // The links are inline so "briefly…" answers (shorten) keep them.
      if (!availability.public) return `For availability and role discussions, please contact ${FIRST} directly: email [${profile.email}](mailto:${profile.email}) or connect on [LinkedIn](${profile.linkedin}).`
      const modes = availability.workModes.map((m) => m.toLowerCase())
      if (!availability.open) return `${FIRST} isn't actively looking right now. You can still reach him at [${profile.email}](mailto:${profile.email}).`
      const askedModes = modes.filter((m) => new RegExp(`\\b${m.replace('onsite', 'on-?site|office')}\\b`).test(q))
      // A place named after "to" or "in" ("relocate to Canada"), not "willing to relocate".
      const place = /\b(to|in) (?!(relocat|mov|work|be|join|start|consider|shift)\w*\b)[a-z]/.test(q.replace(/\b(open|willing|able|ready|want|like|happy|keen|prepared)\s+to\b/g, '')) || has(ctx, 'relocate') && /abroad|overseas|international|countr/.test(q)
      const lead =
        has(ctx, 'start') ? `${FIRST}'s notice period is **${availability.notice}**, so that's the earliest start his profile indicates; for exact dates, ask him directly.`
        : has(ctx, 'notice') ? `${FIRST}'s notice period is **${availability.notice}**.`
        : has(ctx, 'relocate') ? (availability.relocation ? `Yes, ${FIRST} is **open to relocation**.${place ? " His profile doesn't name preferred places." : ''}` : `${FIRST} isn't looking to relocate.`)
        : has(ctx, 'workmode') ? `${askedModes.length ? `Yes, ${FIRST} is open to **${list(askedModes, 'or')}** work. ` : ''}He is based in ${availability.location} and open to **${list(modes, 'or')}** work.`
        : has(ctx, 'target') ? `${FIRST} is looking for **${list(availability.roles, 'or')}** roles.`
        : `Yes. ${FIRST} is **open to new opportunities** as ${list(availability.roles, 'or')}.`
      return (
        `${lead}\n\n` +
        table(['Availability', 'Details'], [
          ['**Target roles**', availability.roles.join(', ')],
          ['**Notice period**', availability.notice],
          ['**Location**', `${availability.location}; ${list(modes, 'or')}`],
          ['**Relocation**', availability.relocation ? 'Open to relocation' : 'Not open to relocation'],
        ]) +
        `\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`
      )
    },
  },
  {
    // "What is he doing right now?", "Where does he work currently?", "What's his current job title?"
    // Not "Is he open to work right now?": there "right now" only qualifies an availability question.
    id: 'current-role',
    concepts: { current: 4 },
    not: ['start', 'notice', 'available', 'open', 'relocate', 'workmode'],
    answer: () =>
      img(experience[0].media, profile.company) +
      `\n\n${FIRST} is currently **${profile.role}** at **${profile.company}**, ${experience[0].location} (since ${experience[0].period.split('–')[0].trim()}). ` +
      `There, he ${lowerFirst(experience[0].points[0])}` +
      more('#experience'),
  },
  {
    // "How many devices has he managed through MDM?": the 10,000+ device rollout, then his other MDM work.
    id: 'devices',
    concepts: { devices: 2, mdm: 3, count: 1 },
    require: ['devices', 'mdm'],
    boost: ({ q }) => (named(q) ? -10 : 0),
    answer: () => {
      const { e, p } = pointsWhere(/MDM\/EMM/)[0]
      const other = graphProjects.filter((g) => g.domains.includes('MDM / EMM') && !p.includes(g.text.match(/[\d,]+\+/)?.[0] || '\u0000'))
      return (
        `${lineOf(e, p).replace(/([\d,]+\+ enterprise devices)/, '**$1**')}` +
        (other.length ? `\n\nHis other MDM/EMM work:\n\n${bullets(other.map((g) => `**${g.short}**: ${g.text}`))}` : '') +
        more('#projects')
      )
    },
  },
  {
    // "Has he worked with LLMs?", "Which LLM vendor's agents did he use?": his Claude agent work.
    id: 'ai',
    concepts: { llm: 3, agents: 2, ai: 1 },
    boost: ({ q }) => (named(q) && !/\b(darwin|syngenta)\b/.test(q) ? -10 : 0),
    answer: () => {
      const lead = experience[0].points.find((p) => /Darwin Portal program/.test(p))
      const build = experience[0].points.find((p) => /Claude Code agents/.test(p))
      const area = skills.find((s) => /\bAI\b/.test(s.area))
      return (
        `At ${experience[0].company}, ${FIRST} ${lowerFirst(lead)}` +
        (build ? ` He also ${lowerFirst(build)}` : '') +
        (area ? `\n\nHis ${area.area} skills: ${area.items.join(', ')}.` : '') +
        more('#projects')
      )
    },
  },
  {
    id: 'programming-languages',
    concepts: { programming: 5 },
    answer: () => `From his skills, ${FIRST} programs in **${list(PROGRAMMING)}**, and works with MySQL and SQLite databases.` + more('#skills'),
  },
  {
    id: 'spoken-languages',
    concepts: { language: 3, speak: 3 },
    not: ['programming'],
    answer: ({ q }) => `${FIRST} speaks ${list(languages)}.` + (/speak|spoken|fluent/.test(q) ? '' : ` For code, he lists ${list(PROGRAMMING)}.`),
  },
  {
    id: 'industries',
    concepts: { industry: 4 },
    not: ['inIndustry'],
    answer: () => {
      const rows = VERTICALS.map((v) => `**${v}**: ${list(graphProjects.filter((p) => p.vertical === v).map((p) => p.short))}`)
      return `His resume names ${CARD.verticals.split(', ').length} verticals: ${list(CARD.verticals.split(', '))}. By project:\n\n${bullets(rows)}` + more('#projects')
    },
  },
  {
    // "Any experience in healthcare?", "Tell me about his transit payments work"
    id: 'vertical',
    boost: ({ q }) => (verticalIn(q) && !named(q) ? 4 : 0),
    answer: ({ q }) => {
      const v = verticalIn(q)
      const work = graphProjects.filter((p) => p.vertical === v)
      return `In ${v}, his profile lists ${work.length === 1 ? 'one project' : `${work.length} projects`}:\n\n${bullets(work.map((p) => `**${p.name}**: ${p.text}`))}` + more('#projects')
    },
  },
  {
    id: 'blogs',
    concepts: { blog: 4 },
    // The tech blog leads, as in the Writing section; the comic fan blog is mentioned as outside work (DES-001).
    answer: () =>
      `${FIRST} writes **${blogs.tech.name}**, ${lowerFirst(blogs.tech.tagline)}: ${blogs.tech.description}\n\n` +
      `[Read ${blogs.tech.name} ↗](${blogs.tech.url})\n\n` +
      `Outside work, he also keeps **${blogs.comic.name}**, a personal comic fan blog.\n\n[Read ${blogs.comic.name} ↗](${blogs.comic.url})`,
  },
  {
    id: 'contact',
    concepts: { contact: 4, hireHim: 5 },
    // 'Facebook' in a question about his work (the Meta (Facebook) MDM project) is the project, not his profile.
    boost: ({ q }) =>
      /\b(meta|mdm|qculous)\b/.test(q) || (/\bfacebook\b/.test(q) && /\b(project|buil[dt]|deliver(ed)?|work(ed)? (for|with|on))\b/.test(q)) ? -10 : 0,
    note: false,
    answer: ({ q }) => {
      const linkedin = `[Open LinkedIn profile ↗](${profile.linkedin})`
      const github = `[Open GitHub profile ↗](${profile.github})`
      // Professional channels first (DES-002); Facebook and X get their own answer when asked for by name.
      if (/\bfacebook\b/.test(q) && !/\b(meta|mdm|qculous|project)\b/.test(q)) {
        return `Here is ${FIRST}'s Facebook profile; it opens in a new tab.\n\n[Open Facebook profile ↗](${profile.facebook})\n\nFor work enquiries, email or LinkedIn is best.\n\n${email()}\n\n${linkedin}`
      }
      if (/\b(twitter|tweets?|x\.com)\b|\bon x\b|\bx (profile|account|handle)\b/.test(q)) {
        return `Here is ${FIRST}'s X (Twitter) profile; it opens in a new tab.\n\n[Open X profile ↗](${profile.x})\n\nFor work enquiries, email or LinkedIn is best.\n\n${email()}\n\n${linkedin}`
      }
      if (/git\s?hub/.test(q)) {
        return `Here is ${FIRST}'s GitHub profile; it opens in a new tab.\n\n${github}\n\nThis site's source code is public too: [vinod-profile on GitHub ↗](${profile.source})`
      }
      return /linked\s?in/.test(q)
        ? `Here is ${FIRST}'s LinkedIn profile; it opens in a new tab.\n\n${linkedin}\n\nYou can also email him at ${profile.email}.`
        : `The quickest way to reach ${FIRST} is email, at ${profile.email}. He's also on LinkedIn, GitHub, Facebook and X.\n\n${email()}\n\n${linkedin}\n\n${github}\n\n[Facebook ↗](${profile.facebook}) · [X ↗](${profile.x})`
    },
  },
  {
    id: 'timeline',
    concepts: { timeline: 4 },
    answer: () =>
      `Here is ${FIRST}'s career timeline across ${experience.length} roles, from ${experience.at(-1).period.match(/\d{4}/)[0]} to today.\n\n` +
      chart({
        type: 'timeline',
        title: 'Career timeline',
        data: experience.map((e) => {
          const [a, b] = e.period.split('–')
          return { label: e.company, sub: e.role, start: ym(a), end: ym(b) }
        }),
      }),
  },
  {
    id: 'impact',
    concepts: { impact: 3 },
    answer: () =>
      `Here are the headline numbers: ${stats.map(statLine).join('; ')}.\n\n` +
      'Measured improvements from the resume (percent change):\n\n' +
      chart({
        type: 'bar',
        title: 'Measured improvements',
        unit: '%',
        data: [
          { label: 'Release cycle time (3 weeks → 5 days)', value: 76 },
          { label: 'Build failures reduced', value: 45 },
          { label: 'Device onboarding time reduced', value: 40 },
          { label: 'Production defects reduced', value: 35 },
          { label: 'System performance improved', value: 30 },
          { label: 'Bug escape rate reduced', value: 30 },
          { label: 'Warehouse efficiency improved', value: 25 },
          { label: 'Team attrition reduced', value: 20 },
          { label: 'Operational costs reduced', value: 15 },
        ],
      }) +
      '\n\nRelease cycle time is derived from "3 weeks to 5 days"; the other values are stated in the resume.',
  },
  {
    // "Which companies has he worked for?"; "Has he worked at Google?" names an employer not on his resume.
    id: 'companies',
    concepts: { companies: 3 },
    note: ({ question }) => !EMPLOYER.test(question),
    answer: ({ question }) =>
      (EMPLOYER.test(question) ? `His resume doesn't list **${question.match(EMPLOYER)[1]}** among his employers. ` : '') +
      `${FIRST} has worked at ${experience.length} companies: ${list(experience.map((e) => e.company))}.\n\n` +
      gallery(experience.map((e) => [e.media, e.company]), 4) +
      '\n\n' +
      cappedTable(['Company', 'Role', 'Period'], experience.map((e) => [`**${e.company}**`, e.role, e.period]), 'earlier roles in [Experience](#experience).', 4),
  },
  {
    id: 'education',
    concepts: { education: 4 },
    answer: () =>
      `${FIRST} holds a Master of Computer Applications (MCA) and a B.Sc., both from colleges in Mumbai.\n\n` +
      img('edu/thakur', 'Thakur Institute of Management Studies') + ' ' + img('edu/ismail-yusuf', 'Ismail Yusuf College') +
      '\n\n' +
      table(['Degree', 'Institution', 'Years'], [
        ['Master of Computer Applications (MCA)', 'Thakur Institute of Management Studies, Career Development & Research, Mumbai', '2008 – 2011'],
        ['Bachelor of Science (B.Sc.)', 'Ismail Yusuf College, Mumbai', '2005 – 2008'],
      ]) +
      '\n\nThe resume lists college education only; no school details are included.',
  },
  {
    id: 'location',
    concepts: { location: 4 },
    note: false,
    answer: () =>
      img('location/bengaluru', 'Bengaluru, Karnataka, India') +
      `\n\n${FIRST} is based in **${profile.location}**, India. A street address isn't shared publicly; reach him by [email](mailto:${profile.email}) or [LinkedIn](${profile.linkedin}).`,
  },
  {
    id: 'photo',
    concepts: { photo: 4 },
    boost: ({ q }) => (named(q) ? -10 : 0),
    note: false,
    answer: () => img('profile', profile.name) + `\n\n${profile.name}, ${profile.role} at ${profile.company}, based in ${profile.location}.`,
  },
  {
    // "Who is Vinod?", "Summarise him", "Pitch him in two sentences", "tl;dr", "Describe him in a single line".
    id: 'summary',
    concepts: { summary: 3, summaryShort: 2 },
    boost: ({ brief }) => (brief ? 1 : 0),
    note: false,
    answer: (ctx) => {
      const s = sentencesOf(profile.summary)
      const opening = `${FIRST} is ${article(s[0])} ${lowerFirst(s[0])}`
      if (ctx.brief === 1) return opening
      // A pitch uses the two-sentence pitch from the hero (data.js profile.pitch).
      if (has(ctx, 'pitch') && profile.pitch) {
        const p = sentencesOf(profile.pitch)
        return [`${FIRST} is ${article(p[0])} ${p[0]}`, ...p.slice(1, ctx.brief || 2).map((x) => x.replace(/^Led\b/, 'He led'))].join(' ')
      }
      if (ctx.brief) return [opening, ...s.slice(1, ctx.brief)].join(' ')
      // "Summarise him" gets two sentences; "Who is Vinod?" the full summary.
      return img('profile', profile.name) + '\n\n' + (/summar/.test(ctx.q) ? s.slice(0, 2) : s).join(' ')
    },
  },
  {
    // "Show me his projects": a short list (CHAT-003), with the full set in the Projects section.
    id: 'projects',
    concepts: { projects: 3 },
    boost: ({ q }) => (named(q) || companiesIn(q).length ? -10 : 0),
    answer: () => {
      const shown = projects.slice(0, 4)
      return (
        `${FIRST}'s featured projects include:\n\n` +
        gallery(shown.map((p) => [p.media, p.name.split(' – ')[0]]), 4) +
        '\n\n' +
        bullets(shown.map((p) => `**${p.name}** (${p.tag})`)) +
        `\n\n+${projects.length - shown.length} more featured projects and ${otherProjects.length} other notable ones, such as ${list(otherProjects.slice(0, 2))}.` +
        more('#projects')
      )
    },
  },
]

// The best-scoring intent for a question, or null.
function pickIntent(ctx) {
  let best = null
  for (const intent of INTENTS) {
    if (intent.not?.some((c) => ctx.has.has(c))) continue
    if (intent.require && !intent.require.some((c) => ctx.has.has(c))) continue
    let score = intent.boost ? intent.boost(ctx) : 0
    for (const [c, w] of Object.entries(intent.concepts || {})) if (ctx.has.has(c)) score += w
    if (score >= (intent.min ?? 3) && (!best || score > best.score)) best = { intent, score }
  }
  return best?.intent || null
}

// A short answer for "in one sentence", "tl;dr", "briefly" (CHAT-003): the first n sentences of prose,
// without charts, tables, images or link buttons, keeping a "More in …" link.
// Not after abbreviations: "Xoriant Solutions Pvt. Ltd", "e.g. Darwin".
const BRIEF_SPLIT = /(?<!\b(?:Pvt|Ltd|Inc|Co|Mr|Ms|Dr|vs|e\.g|i\.e)\.)(?<=[.!?])\s+(?=[A-Z0-9“"(*])/
function shorten(answer, n) {
  const link = answer.match(/\[More in [^\]]+\]\(#[\w-]+\)/)?.[0]
  const text = answer
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/^\|.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\+\d+ more.*$/gm, '')
    .replace(/^\s*\[[^\]]*\]\([^)]*\)\s*$/gm, '')
    .replace(/^- (.*?)\.?$/gm, '$1.')
  const parts = text.split(/\n+/).flatMap((line) => line.trim().split(BRIEF_SPLIT)).map((s) => s.trim()).filter((s) => s && !/:$/.test(s))
  // "Yes." on its own isn't an answer: very short pieces join the sentence after them.
  const sentences = parts.reduce((out, s, i) => (i && out.at(-1).length < 20 ? [...out.slice(0, -1), `${out.at(-1)} ${s}`] : [...out, s]), [])
  return sentences.length ? sentences.slice(0, n).join(' ') + (link ? `\n\n${link}` : '') : answer
}

const SKILL_QUESTION = /\b(skills?|stack|tech\w*|tools?|platforms?|frameworks?|languages?|libraries|know|knows|used?|experience|familiar|hands-on|proficient|expertise)\b/
const fullSkills = () =>
  cappedTable(['Area', 'Technologies'], skills.map((s) => [`**${s.area}**`, s.items.join(', ')]), `areas: ${list(skills.slice(MAX_ITEMS).map((s) => s.area))}. [See all in Skills](#skills)`)

// "Does he know Python?", "Which mobile platforms does he know?": the matching skill areas or
// items, plus one sentence of evidence from his roles. null when no skill matches.
function skillAnswer(base, terms) {
  const hits = skills
    .map((s) => {
      const area = tokenize(skillWords(s)).filter((t) => t !== 'engineering').some((t) => terms.has(t))
      return { s, area, items: area ? s.items : s.items.filter((item) => tokenize(item).some((t) => terms.has(t) && !GENERIC_SKILL_WORDS.has(t))) }
    })
    .filter((h) => h.items.length)
  if (!hits.length) return null
  if (hits.length >= skills.length - 2) return fullSkills()
  const lines = hits.map((h) =>
    h.area || h.items.length > 2 ? `His ${areaName(h.s)} skills: ${h.items.join(', ')}.` : `**${list(h.items)}** ${h.items.length > 1 ? 'are' : 'is'} in his ${areaName(h.s)} skills.`,
  )
  // Evidence: the first resume bullet or project that names the skill.
  const words = [...base, ...terms].filter((t) => t.length > 1 && !STOP.has(t) && !['ai', 'skills', 'technologies'].includes(t))
  let evidence = ''
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`, 'i')
    const e = experience.find((x) => x.points.some((p) => re.test(p)))
    if (e) {
      evidence = `At ${e.company}: ${e.points.find((p) => re.test(p))}`
      break
    }
  }
  return (lines.length > 1 ? bullets(lines) : lines[0]) + (evidence ? `\n\n${evidence}` : '') + more('#skills')
}

// The best passages for the question's terms: whole passages when detail is asked for ("tell me
// more"), otherwise the two or three best sentences, about 600 characters at most.
function retrieve(terms, { detail = false } = {}) {
  const scored = chunks
    .map((c) => {
      let score = 0
      for (const t of terms) {
        if (c.titleTokens.has(t)) score += 3
        score += c.textTokens.filter((w) => matches(w, t)).length
      }
      return { c, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return null

  // Skill questions get every matching skill area.
  if (scored[0].c.skill) {
    const areas = scored.filter((x) => x.c.skill && x.score >= scored[0].score * 0.6)
    return areas.map((x) => x.c.text).join('\n\n') + more('#skills')
  }
  const top = scored[0].c
  const lead = top.media ? img(top.media, top.label) + '\n\n' : ''
  const label = (c) => (c.source ? `**${c.source}**: ` : '')
  if (detail) return lead + label(top) + top.text + more(top.href)

  const hits = (s) => {
    const words = tokenize(s)
    return [...terms].reduce((n, t) => n + (words.some((w) => matches(w, t)) ? 2 : 0), 0)
  }
  // Project and current-role passages always open with their summary sentence.
  const ranked = top.sentences.map((s, i) => ({ s, i, n: top.leadFirst && i === 0 ? Infinity : hits(s) })).sort((a, b) => b.n - a.n || a.i - b.i)
  const picked = []
  let length = 0
  for (const r of ranked) {
    // A sentence that matches nothing only pads out a passage whose first pick didn't match either.
    const padding = r.n === 0 && picked.length && (picked.length >= 2 || (picked[0].n > 0 && picked[0].n !== Infinity))
    if (picked.length === 3 || (picked.length && length + r.s.length > 600) || padding) break
    picked.push(r)
    length += r.s.length
  }
  let text = label(top) + picked.sort((a, b) => a.i - b.i).map((r) => r.s).join(' ')
  // A second passage that matches nearly as well adds its best sentence.
  const second = scored[1]
  if (second && second.score >= scored[0].score * 0.8 && !second.c.skill && length < 450) {
    const best = second.c.sentences.map((s) => ({ s, n: hits(s) })).sort((a, b) => b.n - a.n)[0]
    if (best.n && best.s.length < 600 - length) text += `\n\n${label(second.c)}${best.s}`
  }
  return lead + text + more(top.href)
}

// Follow-ups ("Tell me more", "And before that?", "What did he do there?") reuse the company or
// project the previous question or answer was about.
const COMPANY_NAMES = experience.map((e, i) => ({ type: 'company', i, name: e.company, re: COMPANY_RES[i] }))
const PROJECT_REFS = projects.map((p, i) => ({ type: 'project', i, name: p.name.split(' – ')[0], re: new RegExp(`\\b(${p.name.toLowerCase().split(/[\s(–]/)[0]}${/syngenta/i.test(p.name) ? '|syngenta' : ''})\\b`) }))
// The project, else the company, mentioned first: "Before Accenture, he was … at HTC" is about HTC
// when it opens with HTC's logo, so a second "And before that?" moves on from HTC.
const firstIn = (refs, t) =>
  refs.map((e) => ({ e, at: t.search(e.re) })).filter((x) => x.at >= 0).sort((a, b) => a.at - b.at)[0]?.e
const entityIn = (text = '') => {
  const t = text.toLowerCase()
  return firstIn(PROJECT_REFS, t) || firstIn(COMPANY_NAMES, t)
}
const MORE = /^(and\s+)?(tell me more|more( please| details)?|go on|continue|elaborate|expand( on (that|this|it))?|keep going|what else|anything else)\b/
const BEFORE = /\b(before (that|this|then|there)|previous(ly)?|prior to (that|this)|earlier)\b/
// Not a bare "next": "Can he start next month?" is a question of its own.
const AFTER = /\b(after (that|this|there|then)|next (role|job|company|employer|position)|what came next|then what|what next)\b/
const PRONOUN = /\b(there|it|that (role|job|company|project|one)|this (role|job|company|project)|them|those)\b|^(and|what about|how about)\b/

function describeCompany(i, intro) {
  const e = experience[i]
  if (!e) return null
  return img(e.media, e.company) + `\n\n${intro}**${e.role}** at **${e.company}**, ${e.location} (${e.period}). ${e.points[0]}` + more('#experience')
}

function followUp(question, q, history) {
  const prevQ = [...history].reverse().find((m) => m.role === 'user')?.content
  if (!prevQ) return null
  const prevA = [...history].reverse().find((m) => m.role === 'assistant')?.content || ''
  const isMore = MORE.test(q)
  const before = BEFORE.test(q)
  const after = AFTER.test(q)
  if (!isMore && !before && !after && !PRONOUN.test(q)) return null
  if (entityIn(q)) return null // names its own subject
  const ent = entityIn(prevQ) || entityIn(prevA.slice(0, 400))
  const companyOf = (e) => (e?.type === 'company' ? e.i : e ? experience.findIndex((x) => x.company === projects[e.i].caseStudy?.company) : -1)
  const ci = companyOf(ent)

  if ((before || after) && ci >= 0) {
    const j = before ? ci + 1 : ci - 1
    if (j >= experience.length) return `${experience[ci].company} was his first role (${experience[ci].period}).`
    if (j < 0) return `${experience[ci].company} is his current role.`
    return describeCompany(j, before ? `Before ${experience[ci].company}, he was ` : `After ${experience[ci].company}, he became `)
  }
  if (isMore) {
    if (ent?.type === 'project') return retrieve(new Set(tokenize(projects[ent.i].name)), { detail: true })
    if (ent?.type === 'company') {
      const e = experience[ent.i]
      return img(e.media, e.company) + `\n\n**${e.company} · ${e.role} · ${e.period}**\n\n${bullets(e.points)}` + more('#experience')
    }
    return answerLocally(prevQ, [], { detail: true })
  }
  if (/\bprojects?\b/.test(q) && ci >= 0) {
    const work = projects.filter((p) => p.caseStudy?.company === experience[ci].company)
    if (work.length) return `At ${experience[ci].company}, his projects include:\n\n${bullets(work.map((p) => `**${p.name}**: ${sentencesOf(p.text)[0]}`))}` + more('#projects')
  }
  // A question with a clear topic of its own ("Is it possible he starts next month?") isn't about
  // the previous subject, even with a pronoun in it.
  if (pickIntent({ q, question, has: conceptsOf(question), brief: 0 })) return null
  if (ent) return answerLocally(`${question} ${ent.name}`)
  return answerLocally(`${question} ${prevQ}`)
}

// Words that only ask for a short answer, for "Vinod in one line" or "tl;dr please".
const BRIEF_WORDS = new Set('one single two three 1 2 3 sentence sentences line lines liner oneliner tldr brief briefly short quick quickly pitch sum up nutshell word words few give say put'.split(' '))

// history: earlier turns as [{ role: 'user' | 'assistant', content }], used for follow-ups.
export function answerLocally(question, history = [], { detail = false } = {}) {
  const q = question.toLowerCase().trim()
  if (history.length) {
    const reply = followUp(question, q, history)
    if (reply) return reply
  }
  // "In one sentence", "tl;dr", "briefly" shorten any answer, not only the summary (CHAT-003).
  const n = brevity(question)
  const answer = answerQuestion(question, q, n, detail)
  return n ? shorten(answer, n) : answer
}

function answerQuestion(question, q, brief, detail) {
  // Technology or skill terms the profile never uses ("Has he used Kubernetes?", "Go or Rust") get an
  // honest note. Only named technology, domain or qualification terms count (missingIn above).
  const names = missingIn(question)
  const missingWords = new Set(names.flatMap((t) => tokenize(t)))
  const base = tokenize(question).filter((t) => !missingWords.has(t))
  const terms = new Set(base.flatMap((t) => [t, ...tokenize(SYNONYMS[t] || '')]))
  const note = names.length ? `His profile doesn't mention **${list(names, 'or')}**` : ''
  const withNote = (answer) => (note ? `${note}. Here's what it does say:\n\n${answer}` : answer)

  const ctx = { q, question, has: conceptsOf(question), brief }
  const intent = pickIntent(ctx)
  if (intent) {
    const noted = typeof intent.note === 'function' ? intent.note(ctx) : intent.note !== false
    return noted ? withNote(intent.answer(ctx)) : intent.answer(ctx)
  }

  if (note && base.every((t) => GENERIC.has(t))) {
    return `${note}, so I can't confirm it. You can see what his profile does list under [Skills](#skills) and [Experience](#experience).`
  }
  // Questions made only of stop words ("Who is Vinod?") or of short-answer words ("Vinod in one line")
  // get the summary.
  if (!terms.size || (brief && base.every((t) => BRIEF_WORDS.has(t)))) return INTENTS.find((i) => i.id === 'summary').answer(ctx)

  if (YES_NO.test(q) || SKILL_QUESTION.test(q)) {
    const skill = skillAnswer(base, terms)
    if (skill) return withNote(skill)
  }
  if (/\b(skills?|stack|tech\w*|tools)\b/.test(q)) return withNote(fullSkills())

  const answer = retrieve(terms, { detail })
  if (answer) return withNote(answer)
  const tryThese = suggestedPrompts.slice(1, 5).map((p) => `“${p.replace(/\?$/, '')}”`).join(', ')
  return (
    (note ? `${note}. ` : "I couldn't find that in his profile. ") +
    `You could try ${tryThese}. You can also ask ${FIRST} directly at [${profile.email}](mailto:${profile.email}) or on [LinkedIn](${profile.linkedin}).`
  )
}
