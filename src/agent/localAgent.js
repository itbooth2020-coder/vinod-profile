// Offline fallback agent: direct answers for the questions recruiters ask most, rich answers
// (images, tables, charts) for common requests, then keyword retrieval over the resume data in
// src/data.js, answered with the best two or three sentences rather than whole entries.
// Used when the live Claude agent (/api/ask) isn't available, e.g. on static hosting.
// Answers use the same Markdown subset as the live agent (see components/RichText.jsx).
// Regression test: scripts/test-local-agent.mjs (npm run test:agent).
import { profile, profileCard, stats, availability, leadership, highlights, experience, projects, graphProjects, otherProjects, skills, certifications, education, languages, blogs, suggestedPrompts } from '../data.js'
import { LEXICON } from './fitLexicon.js'

const FIRST = profile.firstName.split(' ')[0]
const YEARS = profile.tagline.match(/\d+\+?/)[0] // e.g. '14+'
const CARD = Object.fromEntries(profileCard)
const BASE = import.meta.env?.BASE_URL ?? '/'
// An absolute link in the browser, so the answer can show it as a button (RichText links only web URLs).
const resumeUrl = () =>
  typeof location !== 'undefined' ? new URL(`${BASE}${profile.resume}`, location.href).href : `${BASE}${profile.resume}`

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
}

const tokenize = (s) =>
  s.toLowerCase()
    .replace(/[^a-z0-9+#./ ]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[./]+|[./]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))

const sentencesOf = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).filter(Boolean)
const lowerFirst = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
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
  ...skills.map((s) => ({ title: `${s.area} skills technologies stack`, sentences: [`${s.area}: ${s.items.join(', ')}.`], href: '#skills', skill: true })),
  { title: 'Certifications courses learning', sentences: [`Certifications: ${certifications.join('; ')}.`], href: '#credentials' },
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
// Words that can be missing from the profile without the question being about something it lacks.
const GENERIC = new Set((
  'hands on familiar proficient comfortable good strong expert skilled solid deep exposure background knowledge ' +
  'expertise skill skills tool tools tech done held hold holds own owned lead led manage managed handled handle ' +
  'built build shipped ship delivered deliver created create made make run ran implemented implement written write ' +
  'got get been go mentor mentored hire hired earned completed studied open ok okay willing able ready interested ' +
  'available fully actively currently still kind sort type lot lots well people team teams year years time project ' +
  'projects app apps move relocate join start other others ones one'
).split(' '))
const CONCEPTS = new Set(['llm', 'llms', 'genai', 'ai', 'ml'])
const known = (t) => VOCAB.has(stem(t)) || GENERIC.has(t) || CONCEPTS.has(t) || /^\d/.test(t)

// "His profile doesn't mention X" is only said for real technology, skill, domain or qualification
// terms (AI-003), never for ordinary words ("next", "individual", "machine"). The vocabulary is the
// role-fit lexicon (fitLexicon.js) plus common terms it doesn't list. Single words count from every
// category; multi-word terms ("Spring Boot") only from the technical ones, so leadership phrasing like
// "people manager" or "tech lead" is never reported as missing.
const EXTRA_TOPICS = (
  'mba phd doctorate startup startups crisis blockchain web3 crypto solidity ethereum jira confluence figma ' +
  'selenium appium cypress jest junit espresso hadoop hive unity cobol perl haskell elixir erlang clojure lua ' +
  'matlab sas sharepoint servicenow shopify magento wordpress drupal laravel symfony nestjs nuxt gatsby bootstrap ' +
  'tailwind webgl threejs opengl cuda pandas numpy scikit keras langchain llamaindex pinecone gemini mistral ' +
  'openshift heroku vercel netlify cloudflare nginx apache tomcat weblogic websphere sap abap cissp pmp itil ' +
  'togaf prince2 csm aws gcp'
).split(' ')
const COMMON_WORDS = new Set(['safe', 'express', 'spark', 'go', 'mobile', 'web', 'cloud', 'delivery', 'programs', 'clients', 'strategy'])
const TECH_CATS = new Set(['Languages', 'Mobile', 'Web', 'Backend', 'Data', 'Cloud', 'DevOps', 'AI/ML', 'IoT', 'Devices', 'Education', 'Domain'])
const termsOf = (e) => [e.label, ...(e.aliases || []), ...(e.exact || [])].map((s) => s.toLowerCase())
const TOPICS = new Set([
  ...LEXICON.flatMap(termsOf).filter((s) => !/\s/.test(s)).flatMap((s) => tokenize(s)).filter((t) => !COMMON_WORDS.has(t)),
  ...EXTRA_TOPICS,
])
const PROFILE_TEXT = JSON.stringify([profile, experience, projects, graphProjects, otherProjects, skills, certifications, education, highlights, leadership]).toLowerCase()
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const hasPhrase = (text, p) => new RegExp(`(^|[^a-z0-9])${escapeRe(p)}($|[^a-z0-9])`).test(text)
// Multi-word terms of lexicon entries with no evidence at all in the profile (none of the entry's
// names appear), so "cloud platforms" isn't reported missing when "Cloud" is evidenced.
const PHRASES = [
  ...new Set([
    ...LEXICON.filter((e) => TECH_CATS.has(e.cat) && ![...termsOf(e), ...(e.also || []).map((s) => s.toLowerCase())].some((t) => hasPhrase(PROFILE_TEXT, t)))
      .flatMap(termsOf)
      .filter((s) => /^[a-z0-9.+# -]+$/.test(s) && /\s/.test(s)),
    'deep learning', 'neural networks', 'neural network', 'data science', 'reinforcement learning',
  ]),
]

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
// The question's own spelling of a word, e.g. "Kubernetes" or "AWS".
const asAsked = (question, t) => question.match(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`, 'i'))?.[0] || t

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

const PROJECT_NAMES = /\b(darwin|presto|vusion|meijer|meta|intelity|bayer|elder|clinic)\b/
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
    picked.map((r) => r.p).join(' ') +
    more('#experience')
  )
}

// Requests with a direct answer, or that read better as links, images, tables or charts than as
// text. First match wins. note: true lets a "not in his profile" note go before the answer.
const RICH = [
  {
    // Prompt injection: this agent has no instructions to reveal, and nothing to override.
    test: (q) => /\b(ignore|disregard|forget)\b.*\b(rules|instructions|prompt|above)\b|\b(print|show|reveal|repeat|tell me) (me )?(your|the) (system )?(prompt|instructions|rules)\b/.test(q),
    answer: () => `I can't do that. I'm a search over ${FIRST}'s resume and profile on this page, so I can only answer questions about his experience, projects and skills.`,
  },
  {
    // "Can I get his resume?", "Download CV", but not "What does his resume say about…?"
    test: (q) => /\b(resume|résumé|cv|curriculum vitae)\b/.test(q) && !/\b(resume|cv) (say|says|mention|mentions|cover|covers|state|states|list|lists)\b/.test(q),
    answer: () => `Here is ${FIRST}'s resume as a PDF; it opens in a new tab.\n\n[Download resume (PDF)](${resumeUrl()})`,
  },
  {
    test: (q) => /\b(married|marital|wife|husband|spouse|kids|children|religion|caste|how old|age|birthday|born|date of birth|dob)\b/.test(q),
    answer: () => `His resume doesn't cover personal details like that; I can only answer questions about his work.`,
  },
  {
    test: (q) => /\b(salary|compensation|ctc|remuneration|pay (expectations?|range)|expected pay|package)\b/.test(q),
    answer: () => `His profile doesn't include salary expectations; that's best discussed with ${FIRST} directly.\n\n${email()}`,
  },
  {
    // "Rate him as a CTO candidate", "Compare him with a typical EM": no opinions, just the evidence.
    test: (q) => /\b(rate|rank|score|grade|evaluate|assess|compare|compared|versus|vs)\b/.test(q),
    answer: (q) => {
      const role = q.match(ROLE_NAMES) && availability.roles.find((r) => r.toLowerCase() === q.match(ROLE_NAMES)[1])
      return (
        `I can't rate or compare candidates, but here is what his profile shows:\n\n${bullets(strengths(4))}\n\n` +
        (role && availability.open ? `He is open to ${role} roles. ` : '') +
        `To check him against a specific job, paste it into the role-fit checker.\n\n[Check role fit](#fit)`
      )
    },
  },
  {
    // "Why is he leaving Accenture?", "Why is he looking for a change?": the profile gives no reasons,
    // so say so neutrally and point to what it does say.
    test: (q) =>
      /\bwhy (is|was|did|would|does|has) (he|vinod) (\w+ )?(leav\w*|left|quit\w*|look\w*|seek\w*|chang\w*|mov\w*|switch\w*|want\w*|open)\b|\breasons? (for|behind|why) (he|him|his|leaving|the (move|change|switch)|looking|a change)\b/.test(q),
    answer: () =>
      `His profile doesn't state his reasons for looking for a new role, so that's best asked of ${FIRST} directly. ` +
      (availability.open
        ? `What it does say: he is open to ${list(availability.roles, 'or')} roles, and his notice period is ${availability.notice}.`
        : '') +
      `\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`,
  },
  {
    // A named employer: answer from that company's entry, before any current-role or keyword rule (AI-003).
    // Projects ("What did he build for Syngenta?") and "which companies…" lists are handled below.
    test: (q) => companiesIn(q).length > 0 && !PROJECT_NAMES.test(q) && !/\b(compan(y|ies)|employers)\b.*\b(worked|has he|did he)\b|\bwhich compan/.test(q),
    answer: (q) => companiesIn(q).slice(0, 2).map((i) => companyAnswer(i, q)).join('\n\n'),
  },
  {
    // "Is he a people manager or an individual contributor?", "Does he still code?"
    test: (q) => /\bpeople manager\b|\bindividual contributor\b|\bplayer[- ]coach\b|\b(does|do) (he|vinod) (still )?(code|write code|program)\b/.test(q),
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
    test: (q) => /\b(tech|technical|team|engineering) lead\b/.test(q),
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
    // Phone numbers aren't shared by the assistants (AI-004 is an owner decision); point to email and LinkedIn.
    test: (q) => /\b(phone|telephone|cell ?phone|mobile (number|no)|contact number|whats ?app)\b|\bcall (him|vinod)\b/.test(q),
    answer: () => `I don't share a phone number here. The best way to reach ${FIRST} is email or LinkedIn.\n\n${email()}\n\n[Open LinkedIn profile ↗](${profile.linkedin})`,
  },
  {
    // "Has he done any machine learning?": the resume's model-training skill and Darwin's prediction models.
    test: (q) => /\b(machine learning|ml|mlops|predictive (model\w*|analytics)|prediction models?|model training|train(ed|ing)? models?)\b/.test(q),
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
    test: (q) => /\bwhy (should|would|do|must) (we|i|you|anyone|they) hire\b|\bstrengths?\b|\bstands? out\b|\bwhat makes (him|vinod)\b|\bbest qualities\b|\bunique\b/.test(q),
    answer: (q) =>
      `${/strength/.test(q) ? 'His resume points to these strengths' : `Here's the short case for ${FIRST}, from his resume`}:\n\n${bullets(strengths())}\n\n` +
      `To check him against a specific job, paste it into the role-fit checker.\n\n[Check role fit](#fit)`,
  },
  {
    test: (q) => /\bhow (many|much) years\b|\byears of (experience|work)\b|\b(total|overall|professional) experience\b|\bhow (senior|experienced)\b|\bseniority\b|\bexperience level\b|\bhow long has (he|vinod) been\b/.test(q),
    answer: (q) =>
      `${FIRST} has **${YEARS} years** of experience, starting in ${experience.at(-1).period.match(/\d{4}/)[0]}. ` +
      `He is now ${profile.role} at ${profile.company}, and has ${lowerFirst(highlights[0].text)}.` +
      (/senior|seniority|level/.test(q) && availability.open ? ` He is looking for ${list(availability.roles, 'or')} roles.` : '') +
      more('#experience'),
  },
  {
    // "Biggest team he has managed?", "How large are the teams he has led?", "Does he manage managers?"
    test: (q) =>
      /\b(biggest|largest|size of|how (big|large))\b.*\bteams?\b|\bteams? sizes?\b|\bhow many (people|engineers|reports|direct reports)\b|\bmanag\w* (other |engineering |multiple |several |people )?managers\b|\bmanagers? of managers\b/.test(q),
    answer: (q) =>
      (/managers/.test(q) ? `His resume doesn't say whether he manages other managers. ` : '') +
      `${FIRST} has ${lowerFirst(highlights[0].text)}. At ${profile.company} he manages a team of **35+ engineers** across Android, iOS and web, ` +
      `and owns the engineering budget for that 35-engineer org. At HTC Global Services he led teams of 15–25 engineers.` +
      more('#lead'),
  },
  {
    // "How does he hire engineers?" (not "hire him": that's contact, below).
    test: (q) => /\b(hir(e|es|ing)|recruit\w*|mentor\w*|interview\w*|grow(s|ing)? (engineers|people|talent))\b/.test(q) && !/\bhire (him|vinod)\b|\b(i|we) hire\b/.test(q),
    answer: (q) => {
      const group = leadership.find((l) => /hiring/i.test(l.title)) || leadership[0]
      return (
        `On ${group.title.replace(' & ', ' and ').toLowerCase()}, his resume lists:\n\n${bullets(group.points)}` +
        (/hir|recruit|interview/.test(q) ? `\n\nIt doesn't describe his interview process.` : '') +
        more('#lead')
      )
    },
  },
  {
    test: (q) => /\b(budget|p\s?&\s?l|p and l|profit and loss|costs?)\b/.test(q),
    answer: (q) => {
      const group = leadership.find((l) => /budget/i.test(l.title))
      const htc = experience[1].points.find((p) => /budget/i.test(p))
      return (
        `Yes, ${FIRST} has owned engineering budgets:\n\n${bullets([...(group?.points || []).filter((p) => /budget|cost/i.test(p)),...(htc ? [`At ${experience[1].company}: ${lowerFirst(htc)}`] : [])])}` +
        (/p\s?&\s?l|p and l|profit/.test(q) ? `\n\nThe resume describes engineering budget ownership; it doesn't mention P&L responsibility.` : '') +
        more('#lead')
      )
    },
  },
  {
    // "Is he a fit for this role?", "match this job": point to the role-fit checker (components/RoleFit.jsx).
    test: (q) =>
      /\b(fit|match(es)?|suitable|qualified)\b.*\b(job|role|position|opening|jd|vacanc\w*|description)\b|\b(is|would) (he|vinod) (be )?(a )?(good |right |strong )?fit\b/.test(q),
    answer: () =>
      `Paste the job description into the role-fit checker. It lists the requirements ${FIRST}'s experience covers, with evidence from his roles and projects, and what isn't evident in the profile. It runs in your browser.\n\n[Check role fit](#fit)`,
  },
  {
    // "Is he open to work?", "notice period?", "how soon could he join us?", "would he move to Dubai?",
    // "remote?", "what roles is he targeting?"
    test: (q) =>
      /\b(availab\w*|notice|relocat\w*|open to (work|new|roles?|opportunit\w*|offers?|remote|hybrid|on-?site)|looking for (a )?(new )?(job|role|opportunit\w*)|job hunting|join(ing)? date|start date|how soon|join (us|the team|our team|a new|our company)|move to|target(s|ing|ed)?|seeking|(kind|type|sort) of (roles?|jobs?|positions?)|what (roles?|positions?)|(remote|hybrid|on-?site) (work|role|job|position|option)s?|work(ing)? (remotely|from home))\b|when (can|could|would) (he|vinod) (start|join)|\b(can|could) (he|vinod) (start|join)\b|\bstart(ing)? (date|next|in|immediately|soon|right away|asap)\b|\b(available|ready) to (start|join)\b|\bearliest (start|joining)\b|\bimmediate joiner\b|\b(what|which) (job )?titles?\b|\btitles?\b.*\b(looking|seeking|want\w*|target\w*|next|open)\b|\b(roles?|positions?|jobs?) (is|are) (he|vinod) (looking|seeking|open)\b|\b(he|vinod) (is )?(looking|seeking) for\??$|\b(remote|hybrid|on-?site)\W*$/.test(q),
    answer: (q) => {
      const modes = availability.workModes.map((m) => m.toLowerCase())
      if (!availability.open) return `${FIRST} isn't actively looking right now. You can still reach him at [${profile.email}](mailto:${profile.email}).`
      // Lead with a direct answer to what was asked, then the full picture.
      const lead =
        /\b(can|could|when|ready|available|earliest|immediate)\b.*\b(start|join)|\bstart(ing)? (date|next|in|immediately|soon|right away|asap)/.test(q)
          ? `${FIRST}'s notice period is **${availability.notice}**, so that's the earliest start his profile indicates; for exact dates, ask him directly.`
        : /notice|join|start|how soon/.test(q) ? `${FIRST}'s notice period is **${availability.notice}**.`
        : /relocat|move to/.test(q) ? (availability.relocation ? `Yes, ${FIRST} is **open to relocation**.${/\b(to|in) [a-z]/.test(q.replace(/open to/, '')) ? " His profile doesn't name preferred places." : ''}` : `${FIRST} isn't looking to relocate.`)
        : /remote|hybrid|on-?site|from home/.test(q) ? `${FIRST} is based in ${availability.location} and open to **${list(modes, 'or')}** work.`
        : /target|seeking|kind of|type of|sort of|titles?|what (roles?|positions?)/.test(q) ? `${FIRST} is looking for **${list(availability.roles, 'or')}** roles.`
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
    // "What is he doing right now?", "Where does he work currently?", "What is his current role?"
    test: (q) => /\b(right now|currently|current(ly)? (role|job|position|employer|company)|these days|at the moment|nowadays|present (role|job|position))\b|\bwhere does (he|vinod) work\b/.test(q),
    answer: () =>
      img(experience[0].media, profile.company) +
      `\n\n${FIRST} is currently **${profile.role}** at **${profile.company}**, ${experience[0].location} (since ${experience[0].period.split('–')[0].trim()}). ` +
      `There, he ${lowerFirst(experience[0].points[0])}` +
      more('#experience'),
  },
  {
    test: (q) => /\b(programming|coding|code|computer|software|development) languages?\b|\blanguages?\b.*\b(code|coding|program\w*|develop\w*|build)\b/.test(q),
    answer: () =>
      `From his skills, ${FIRST} programs in **${list(PROGRAMMING)}**, and works with MySQL and SQLite databases.` + more('#skills'),
  },
  {
    test: (q) => /\blanguages?\b|\b(speak|speaks|spoken|fluent)\b.*\b(english|hindi|marathi)\b/.test(q),
    answer: (q) =>
      `${FIRST} speaks ${list(languages)}.` +
      (/speak|spoken|fluent/.test(q) ? '' : ` For code, he lists ${list(PROGRAMMING)}.`),
  },
  {
    test: (q) => /\b(industr(y|ies)|verticals?|sectors?|domains?)\b/.test(q),
    answer: () => {
      const rows = VERTICALS.map((v) => `**${v}**: ${list(graphProjects.filter((p) => p.vertical === v).map((p) => p.short))}`)
      return `His resume names ${CARD.verticals.split(', ').length} verticals: ${list(CARD.verticals.split(', '))}. By project:\n\n${bullets(rows)}` + more('#projects')
    },
  },
  {
    // "Any experience in healthcare?", "Tell me about his transit payments work"
    test: (q) => Boolean(verticalIn(q)) && !PROJECT_NAMES.test(q),
    answer: (q) => {
      const v = verticalIn(q)
      const work = graphProjects.filter((p) => p.vertical === v)
      return `In ${v}, his profile lists ${work.length === 1 ? 'one project' : `${work.length} projects`}:\n\n${bullets(work.map((p) => `**${p.name}**: ${p.text}`))}` + more('#projects')
    },
  },
  {
    test: (q) => /\b(blogs?|blogging|articles?|writes?|writing|comics?|batman|android ?super ?nerds)\b/.test(q),
    answer: () =>
      `${FIRST} writes two blogs:\n\n` +
      table(['Blog', 'About'], [
        [`**${blogs.tech.name}**`, blogs.tech.description],
        [`**${blogs.comic.name}**`, blogs.comic.description],
      ]) +
      `\n\n[Read ${blogs.tech.name} ↗](${blogs.tech.url})\n\n[Read ${blogs.comic.name} ↗](${blogs.comic.url})`,
  },
  {
    // Not bare "hire": "How does he hire engineers?" is about his hiring (above).
    test: (q) => /\b(linked\s?in|git\s?hub|facebook|twitter|social|contact|reach|connect|email|e-mail|mail|get in touch|hire (him|vinod))\b|\b(i|we) hire\b/.test(q),
    answer: (q) => {
      const linkedin = `[Open LinkedIn profile ↗](${profile.linkedin})`
      const github = `[Open GitHub profile ↗](${profile.github})`
      const social = `${github}\n\n[Facebook ↗](${profile.facebook})\n\n[X (Twitter) ↗](${profile.x})`
      if (/git\s?hub/.test(q)) {
        return `Here is ${FIRST}'s GitHub profile; it opens in a new tab.\n\n${github}\n\nThis site's source code is public too: [vinod-profile on GitHub ↗](${profile.source})`
      }
      return /linked\s?in/.test(q)
        ? `Here is ${FIRST}'s LinkedIn profile; it opens in a new tab.\n\n${linkedin}\n\nYou can also email him at ${profile.email}.`
        : `The quickest way to reach ${FIRST} is email, at ${profile.email}. He's also on LinkedIn, GitHub, Facebook and X (Twitter).\n\n${email()}\n\n${linkedin}\n\n${social}`
    },
  },
  {
    test: (q) => /\b(timeline|journey|work history)\b|career (path|history|graph|chart|progress\w*)|\bprogress(ed|ion)\b|\b(graph|chart|visuali[sz]e)\b.*\b(career|experience|jobs?|roles?)\b/.test(q),
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
    test: (q) => /\b(impact|metrics?|numbers|achievements?|stats|statistics|improvements?|kpis?|results)\b/.test(q),
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
    test: (q) => /\b(compan(y|ies)|employers?|organi[sz]ations?|firms?)\b|worked (at|for)/.test(q),
    // No "doesn't mention" note when the answer already says the named employer isn't on the resume.
    note: (q, question) => !EMPLOYER.test(question),
    // "Has he worked at Google?": a named employer that isn't on his resume (known ones are answered above).
    answer: (q, question = '') =>
      (EMPLOYER.test(question) ? `His resume doesn't list **${question.match(EMPLOYER)[1]}** among his employers. ` : '') +
      `${FIRST} has worked at ${experience.length} companies: ${list(experience.map((e) => e.company))}.\n\n` +
      gallery(experience.map((e) => [e.media, e.company])) +
      '\n\n' +
      cappedTable(['Company', 'Role', 'Period'], experience.map((e) => [`**${e.company}**`, e.role, e.period]), 'earlier roles in [Experience](#experience).'),
  },
  {
    test: (q) => /\b(school|college|educat\w*|stud(y|ied)|degrees?|universit\w*|mca|mms|b\.?sc|qualifications?)\b/.test(q),
    answer: () =>
      img('edu/thakur', 'Thakur Institute of Management Studies') + ' ' + img('edu/ismail-yusuf', 'Ismail Yusuf College') +
      '\n\n' +
      table(['Degree', 'Institution', 'Years'], [
        ['Master of Computer Applications (MCA)', 'Thakur Institute of Management Studies, Career Development & Research, Mumbai', '2008 – 2011'],
        ['Bachelor of Science (B.Sc.)', 'Ismail Yusuf College, Mumbai', '2005 – 2008'],
      ]) +
      '\n\nThe resume lists college education only; no school details are included.',
  },
  {
    test: (q) => /\b(address|located|location|lives?|based|city|hometown)\b|where is he/.test(q),
    answer: () =>
      img('location/bengaluru', 'Bengaluru, Karnataka, India') +
      `\n\n${FIRST} is based in **${profile.location}**, India. A street address isn't shared publicly; reach him by [email](mailto:${profile.email}) or [LinkedIn](${profile.linkedin}).`,
  },
  {
    test: (q) => !PROJECT_NAMES.test(q) && /\b(photos?|pics?|pictures?|images?|headshot|avatar)\b|looks? like/.test(q),
    answer: () => img('profile', profile.name) + `\n\n${profile.name}, ${profile.role} at ${profile.company}, based in ${profile.location}.`,
  },
  {
    test: (q) => /\b(summary|summari[sz]e|overview|introduce|introduction|background|who is)\b/.test(q),
    answer: (q) => {
      const s = sentencesOf(profile.summary)
      // "In one sentence" gets one; "briefly", "summarise", "2-line" get two (CHAT-003); "Who is…" the full summary.
      if (/\b(one|1|single)[ -]?(sentence|line|liner)\b|\btl;?dr\b/.test(q)) return `${FIRST} is a ${lowerFirst(s[0])}`
      return img('profile', profile.name) + '\n\n' + (/\b(2|two|short|quick|brief(ly)?|summar\w*|in short)\b/.test(q) ? s.slice(0, 2) : s).join(' ')
    },
  },
  {
    test: (q) => !PROJECT_NAMES.test(q) && /\b(projects|portfolio)\b/.test(q),
    note: true,
    answer: () =>
      projects.map((p) => img(p.media, p.name.split(' – ')[0])).join(' ') +
      '\n\n' +
      table(['Project', 'Area', 'Highlights'], projects.map((p) => [`**${p.name}**`, p.tag, p.text.split('. ')[0].replace(/\.$/, '') + '.'])) +
      `\n\nAlso: ${otherProjects.join(', ')}.`,
  },
]

const SKILL_QUESTION = /\b(skills?|stack|tech\w*|tools?|platforms?|frameworks?|languages?|libraries|know|knows|used?|experience|familiar|hands-on|proficient|expertise)\b/
const fullSkills = () =>
  cappedTable(['Area', 'Technologies'], skills.map((s) => [`**${s.area}**`, s.items.join(', ')]), `areas: ${list(skills.slice(MAX_ITEMS).map((s) => s.area))}. [See all in Skills](#skills)`)

// "Does he know Python?", "Which mobile platforms does he know?": the matching skill areas or
// items, plus one sentence of evidence from his roles. null when no skill matches.
function skillAnswer(base, terms) {
  const hits = skills
    .map((s) => {
      const area = tokenize(s.area).filter((t) => t !== 'engineering').some((t) => terms.has(t))
      return { s, area, items: area ? s.items : s.items.filter((item) => tokenize(item).some((t) => terms.has(t) && !GENERIC_SKILL_WORDS.has(t))) }
    })
    .filter((h) => h.items.length)
  if (!hits.length) return null
  if (hits.length >= skills.length - 2) return fullSkills()
  const lines = hits.map((h) =>
    h.area || h.items.length > 2 ? `His ${h.s.area} skills: ${h.items.join(', ')}.` : `**${list(h.items)}** ${h.items.length > 1 ? 'are' : 'is'} in his ${h.s.area} skills.`,
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
const entityIn = (text = '') => {
  const t = text.toLowerCase()
  return PROJECT_REFS.find((e) => e.re.test(t)) || COMPANY_NAMES.find((e) => e.re.test(t))
}
const MORE = /^(and\s+)?(tell me more|more( please| details)?|go on|continue|elaborate|expand( on (that|this|it))?|keep going|what else|anything else)\b/
const BEFORE = /\b(before (that|this|then|there)|previous(ly)?|prior to (that|this)|earlier)\b/
const AFTER = /\b(after (that|this|there)|next|then what)\b/
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
  if (ent) return answerLocally(`${question} ${ent.name}`)
  return answerLocally(`${question} ${prevQ}`)
}

// history: earlier turns as [{ role: 'user' | 'assistant', content }], used for follow-ups.
export function answerLocally(question, history = [], { detail = false } = {}) {
  const q = question.toLowerCase().trim()
  if (history.length) {
    const reply = followUp(question, q, history)
    if (reply) return reply
  }

  // Technology or skill terms the profile never uses ("Has he used Kubernetes?", "Spring Boot") get an
  // honest note. Only terms from the topic vocabulary count, so "next" or "individual" never do.
  const phrases = PHRASES.filter((p) => hasPhrase(q, p))
  const phraseWords = new Set(phrases.flatMap((p) => tokenize(p)))
  const base = tokenize(question).filter((t) => !phraseWords.has(t))
  const terms = new Set(base.flatMap((t) => [t, ...tokenize(SYNONYMS[t] || '')]))
  const missingWords = [...new Set(base.filter((t) => t.length > 2 && TOPICS.has(t) && !known(t)))]
  const missing = [...missingWords, ...phrases]
  const note = missing.length
    ? `His profile doesn't mention **${list([...missingWords.map((t) => asAsked(question, t)), ...phrases.map((p) => asAsked(question, p))], 'or')}**`
    : ''
  const withNote = (answer) => (note ? `${note}. Here's what it does say:\n\n${answer}` : answer)

  const rich = RICH.find((r) => r.test(q))
  if (rich) {
    const noted = typeof rich.note === 'function' ? rich.note(q, question) : rich.note
    return noted ? withNote(rich.answer(q, question)) : rich.answer(q, question)
  }

  if (note && missingWords.length === new Set(base).size) {
    return `${note}, so I can't confirm it. You can see what his profile does list under [Skills](#skills) and [Experience](#experience).`
  }
  // Questions made only of stop words ("Who is Vinod?") get the photo and summary.
  if (!terms.size) return img('profile', profile.name) + '\n\n' + profile.summary
  const found = new Set([...terms].filter((t) => !missing.includes(t)))

  if (YES_NO.test(q) || SKILL_QUESTION.test(q)) {
    const skill = skillAnswer(base.filter((t) => found.has(t)), found)
    if (skill) return withNote(skill)
  }
  if (/\b(skills?|stack|tech\w*|tools)\b/.test(q)) return withNote(fullSkills())

  const answer = retrieve(found, { detail })
  if (answer) return withNote(answer)
  const tryThese = suggestedPrompts.slice(1, 5).map((p) => `“${p.replace(/\?$/, '')}”`).join(', ')
  return (
    (note ? `${note}. ` : "I couldn't find that in his profile. ") +
    `You could try ${tryThese}. You can also ask ${FIRST} directly at [${profile.email}](mailto:${profile.email}) or on [LinkedIn](${profile.linkedin}).`
  )
}
