// VINCE: the voice assistant's persona, its follow-up questions and the guided-tour script.
// Everything here is built from src/data.js, so it stays in step with the resume.
import { profile, profileCard, stats, availability, showAvailability, leadership, highlights, experience, projects, skills, education, blogs, graphProjects } from '../data.js'

export const NAME = 'V.I.N.C.E.'
export const EXPANSION = 'Virtual Intelligence for Navigating Career Experience'
const FIRST = profile.firstName.split(' ')[0]

const company = (c) => c.replace(/\s*Pvt\.? Ltd\.?/i, '').replace(/\s*\(.*\)/, '').trim()
const project = (p) => p.name.split(' – ')[0]
const startYear = (period) => period.match(/\d{4}/)[0]
const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ')
const when = (s) =>
  /present/i.test(s)
    ? new Date().getFullYear() + new Date().getMonth() / 12
    : Number(s.match(/\d{4}/)[0]) + MONTHS.indexOf(s.trim().slice(0, 3).toLowerCase()) / 12
const yearsIn = (period) => Math.floor(when(period.split('–')[1]) - when(period.split('–')[0]))
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const YEARS = profile.tagline.match(/\d+\+?/)[0] // e.g. '14+'
const firstSentence = (s) => s.split(/\.(?:\s|$)/)[0] // without its full stop; keeps "99.9%"
const lowerFirst = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)) // keeps acronyms like "AI"
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v)

export const GREETINGS = ['Good morning', 'Good afternoon', 'Good evening']
function greeting() {
  const h = new Date().getHours()
  return GREETINGS[h < 12 ? 0 : h < 17 ? 1 : 2]
}

// greet is the visitor's time-of-day greeting; the server passes each one to prepare the audio
// (live wording). offline: answers come from the in-browser resume search (askAgent.js offline()).
export function introduction(greet = greeting(), { offline = false } = {}) {
  return (
    `${greet}. I'm VINCE: ${EXPANSION}. ` +
    (offline ? `I answer from his resume, which covers ${YEARS} years of work. ` : `I know his ${YEARS} years of work inside out. `) +
    `What would you like to know about ${FIRST}? His experience, his projects, his skills? Or shall I take you on a guided tour?`
  )
}

export const welcomeBack = () => `Welcome back. How else may I help you with ${FIRST}'s profile?`

// A brief, butler-like acknowledgement spoken before each answer.
export const ACKNOWLEDGEMENTS = ['Certainly.', 'Of course.', 'Right away.', 'Very good.', 'Allow me.']
export const acknowledge = () => pick(ACKNOWLEDGEMENTS)

// Questions VINCE can suggest, grouped by topic.
const QUESTIONS = {
  intro: [`Who is ${FIRST}?`, 'Give me a quick summary of his career'],
  role: ['What is his current role?', `What does he do at ${experience[0].company}?`],
  company: experience.slice(1, 5).map((e) => `What did he do at ${company(e.company)}?`),
  timeline: ['Show his career timeline', 'How has his career progressed?'],
  project: projects.map((p) => `Tell me about the ${project(p)} project`),
  ai: ['How does he use AI agents in his work?', 'Which AI tools and frameworks does he know?'],
  skills: skills.filter((s) => !s.earlier && !/librar|method|architect/i.test(s.area)).map((s) => `What ${s.area} skills does he have?`),
  impact: ['What impact has he had?', 'What measurable results has he delivered?'],
  leadership: ['How large are the teams he has led?', 'How does he hire and mentor engineers?'],
  // Only suggested while data.js shows availability; otherwise those questions get a "contact him" reply.
  ...(showAvailability && { availability: ['Is he open to new roles?', 'What is his notice period?'] }),
  education: ['Where did he study?'],
  certs: ['Which certifications does he hold?'],
  blogs: ['Does he write any blogs?'],
  contact: ['How can I contact him?', 'Can I see his LinkedIn profile?'],
  location: ['Where is he based?'],
}

// Topics that naturally follow each other; the first related topics are suggested first.
const RELATED = {
  intro: ['role', 'timeline', 'impact', 'project'],
  role: ['project', 'leadership', 'ai', 'company'],
  company: ['timeline', 'project', 'impact', 'skills'],
  timeline: ['company', 'impact', 'education'],
  project: ['ai', 'skills', 'project', 'impact'],
  ai: ['project', 'skills', 'certs'],
  skills: ['project', 'ai', 'certs'],
  impact: ['leadership', 'project', 'role'],
  leadership: ['impact', 'role', 'availability'],
  availability: ['contact', 'location', 'leadership'],
  education: ['certs', 'skills', 'timeline'],
  certs: ['ai', 'education', 'skills'],
  blogs: ['ai', 'skills', 'contact'],
  contact: ['blogs', 'location', 'impact'],
  location: ['role', 'contact', 'blogs'],
}

const names = (list) => list.map((s) => s.toLowerCase().split(/[\s.(]/)[0]).join('|')
// First match wins, so the more specific topics come first.
const DETECT = [
  ['availability', /availab|notice|relocat|remote|hybrid|onsite|open to (work|new|roles?|opportunit)|join(ing)? date|when can he (start|join)/],
  ['contact', /contact|reach|e-?mail|linkedin|facebook|twitter|social|hire him|get in touch/],
  ['blogs', /blog|comic|batman|writes?\b|writing/],
  ['education', /stud(y|ied)|educat|degree|college|universit|mca|b\.?sc/],
  ['certs', /certif|course/],
  ['location', /\bbased\b|located|location|where (is|does) he live|city/],
  ['ai', /\bai\b|agent|claude|copilot|generative|llm|machine learning|prompt|few-?shot/],
  ['project', new RegExp(`project|portfolio|${names(projects.map((p) => p.name))}`)],
  ['leadership', /team|lead|mentor|hiring|manag/],
  ['impact', /impact|result|metric|achiev|improv|numbers/],
  ['timeline', /timeline|journey|career|progress/],
  ['company', new RegExp(`compan|worked (at|for)|do at|${names(experience.slice(1).map((e) => e.company))}`)],
  ['skills', /skill|stack|tech|kotlin|swift|react|flutter|android|ios|frontend|backend/],
  ['role', /current|role|accenture|job|position/],
  ['intro', /who is|summary|overview|about him|introduc/],
]

const detect = (text) => DETECT.find(([, re]) => re.test(text.toLowerCase()))?.[0]
const norm = (q) => q.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()

// Three questions that follow on from the last exchange, skipping anything already asked.
// Shuffled within each topic, so the suggestions differ from visit to visit.
export function nextQuestions(question = '', answer = '', asked = new Set()) {
  const topic = detect(question) || detect(answer) || 'intro'
  const order = [...RELATED[topic].filter((t) => QUESTIONS[t]), ...shuffle(Object.keys(QUESTIONS))]
  const out = []
  const used = new Set()
  for (const t of order) {
    if (out.length === 3) break
    if (used.has(t)) continue
    const q = shuffle(QUESTIONS[t]).find((c) => !asked.has(norm(c)) && !out.includes(c))
    if (q) {
      out.push(q)
      used.add(t)
    }
  }
  return out
}

export const markAsked = (asked, q) => asked.add(norm(q))

// The spoken invitation that ends each answer.
// Each question ends with punctuation, so speech splits it into its own piece; with a fixed set of
// phrases and questions, the server can prepare every piece of these lines in advance.
const FOLLOW_UPS = [
  (a, b) => `Shall I continue? You might ask: ${a} Or perhaps: ${b}`,
  (a, b) => `Where would you like to go from here? Perhaps: ${a} Or: ${b}`,
  (a, b) => `Is there anything else I can tell you? For instance: ${a} Or: ${b}`,
]
const ended = (q) => (/[.?!]$/.test(q) ? q : `${q}.`)

export function followUpLine([a, b], template = pick(FOLLOW_UPS)) {
  if (!a) return `Is there anything else you'd like to know about ${FIRST}?`
  if (!b) return `You might also ask: ${ended(a)}`
  return template(ended(a), ended(b))
}

// Every spoken piece of a follow-up line, for the server to prepare.
export function followUpPieces() {
  const questions = [...new Set(Object.values(QUESTIONS).flat())].map(ended)
  const [a, b] = questions
  const lines = [...FOLLOW_UPS.map((t) => followUpLine([a, b], t)), followUpLine([a]), followUpLine([])]
  return { lines, questions }
}

const MONTH_NAMES = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Sept: 'September', Oct: 'October', Nov: 'November', Dec: 'December' }
const MON = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)[a-z]*\\.?\\s+(\\d{4})'
const month = (m) => MONTH_NAMES[m.slice(0, 1).toUpperCase() + m.slice(1, m.toLowerCase().startsWith('sept') ? 4 : 3).toLowerCase()] || m
// Date ranges as people say them: "(Jun 2024 – Present)" -> ", since June 2024,";
// "Oct 2016 – May 2024" -> "from October 2016 to May 2024".
const speakDates = (s) =>
  s
    .replace(new RegExp(`\\s*\\(${MON}\\s*[–-]\\s*present\\)`, 'gi'), (_, m, y) => `, since ${month(m)} ${y},`)
    .replace(new RegExp(`${MON}\\s*[–-]\\s*present`, 'gi'), (_, m, y) => `since ${month(m)} ${y}`)
    .replace(new RegExp(`\\s*\\(${MON}\\s*[–-]\\s*${MON}\\)`, 'gi'), (_, m1, y1, m2, y2) => `, from ${month(m1)} ${y1} to ${month(m2)} ${y2},`)
    .replace(new RegExp(`${MON}\\s*[–-]\\s*${MON}`, 'gi'), (_, m1, y1, m2, y2) => `from ${month(m1)} ${y1} to ${month(m2)} ${y2}`)
    .replace(new RegExp(`\\b${MON}`, 'g'), (_, m, y) => `${month(m)} ${y}`)

// Turns a Markdown answer into something worth hearing: visuals are mentioned, not read out,
// button-style links are dropped (their labels read badly: "Email Vinod Open LinkedIn profile"),
// symbols and dates are said as words, and long answers are cut at a sentence with a pointer to
// the screen.
export function toSpeech(md, max = 480) {
  let shown = false
  let links = false
  let text = md
    .replace(/```chart\s*([\s\S]*?)```/g, (_, json) => {
      shown = true
      let title = ''
      try {
        title = JSON.parse(json).title || ''
      } catch {
        /* unreadable chart spec: just mention it */
      }
      return ` I've put ${title ? `a chart of ${title.toLowerCase()}` : 'a chart'} on screen. `
    })
    .replace(/(^\|.*\|\s*$\n?)+/gm, (block) => {
      shown = true
      const rows = block.trim().split('\n').length - 2
      return ` I've put a table${rows > 0 ? ` of ${rows} rows` : ''} on screen.\n`
    })
    .replace(/!\[[^\]]*]\([^)]*\)/g, () => ((shown = true), ''))
    // A link on a line of its own is a button on screen.
    .replace(/^\s*\[[^\]]+]\(([^)]*)\)\s*$/gm, (_, href) => ((links ||= /^(https?:|mailto:)/.test(href)), ''))
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`#>↗]/g, '')
    .replace(/^\s*[-•]\s+(.*?)[.;:,]?\s*$/gm, '$1.')
    .replace(/[\s\S]*/, speakDates)
    .replace(/\s*→\s*/g, ' to ')
    .replace(/(\d+)\s*wks?\b/g, (_, n) => `${n} ${n === '1' ? 'week' : 'weeks'}`)
    .replace(/\s+·\s+/g, ', ')
    // A small lexicon, before "/" becomes "and".
    .replace(/\bCI\/CD\b/g, 'C I C D')
    .replace(/\bMDM\s*\/\s*EMM\b/g, 'device management')
    .replace(/(\d)\s*[–-]\s*(\d)/g, '$1 to $2')
    .replace(/https?:\/\/\S+/g, 'the link on screen')
    .replace(/(\d+)M\+/g, '$1 million plus')
    .replace(/(\d+)K\b/g, '$1 thousand')
    .replace(/(\d%?|thousand)\+/g, '$1 plus')
    .replace(/(\w)\/(\w)/g, '$1 and $2')
    .replace(/&/g, ' and ')
    // The page says "resume"; voices read that as the verb (re-ZOOM), so speech uses the accented
    // noun (é = e-acute), which both Kokoro and browser voices say as REZ-oo-may.
    .replace(/\b([Rr])esume(s?)\b/g, (_, r, s) => `${r}ésumé${s}`)
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/,\s*([,.:;!?])/g, '$1')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (links && !shown) text += ` The links are on screen.`

  if (text.length > max) {
    const cut = text.slice(0, max)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
    text = (end > 80 ? cut.slice(0, end + 1) : cut + '…') + ` ${shown ? 'The rest' : 'The full answer'} is on screen.`
  }
  return text
}

// The guided tour: one stop per page section, narrated in order.
export function tourSteps() {
  const first = experience.at(-1)
  const [p1, p2] = projects
  return [
    {
      target: 'top',
      text: `Very well. Let's begin. ${profile.name} is a ${profile.role} at ${profile.company}, based in Bengaluru. ${profile.tagline}`,
    },
    {
      target: 'impact',
      text: `At a glance: he has ${highlights.slice(0, 3).map((h) => lowerFirst(h.text)).join(', ').replace(/, ([^,]*)$/, ', and $1')}.`,
    },
    {
      target: 'lead',
      text: `How he leads covers ${list(leadership.map((l) => l.title.toLowerCase()))}. For instance, he ${lowerFirst(leadership[0].points[0])}, and ${lowerFirst(leadership[0].points[2])}.`,
    },
    {
      target: 'projects',
      text: `Among his key projects: ${project(p1)}, an ${lowerFirst(firstSentence(p1.text))}. And ${project(p2)}, a ${lowerFirst(firstSentence(p2.text))}.`,
    },
    {
      target: 'experience',
      text: `His journey spans ${experience.length} companies. It began at ${company(first.company)} in ${startYear(first.period)}, ran through more than ${NUMBERS[yearsIn(experience[1].period)] || yearsIn(experience[1].period)} years at ${company(experience[1].company)}, and continues today at ${experience[0].company}, where he leads as ${experience[0].role}.`,
    },
    {
      target: 'skills',
      // Leadership first, as in Skills.jsx; the collapsed Earlier experience group isn't narrated.
      text: `His skills start with ${skills[0].area.toLowerCase()}, such as ${list(skills[0].items.slice(0, 3))}, and cover ${skills.slice(1).filter((s) => !s.earlier).map((s) => s.area.replace(' / ', ' and ')).join(', ').replace(/, ([^,]*)$/, ', and $1')}, from Kotlin and Swift to Claude AI agents.`,
    },
    {
      target: 'credentials',
      text: `He holds a ${education[0].split(' — ')[0].replace(/\s*\(.*\)/, '')} and a ${education[1].split(' — ')[0].replace(/\s*\(.*\)/, '')}, both from Mumbai.`,
    },
    {
      target: 'blogs',
      // The Writing section: the tech blog leads; the comic fan blog is only an 'Outside work' line (DES-001).
      text: `Under Writing, he publishes ${blogs.tech.name}, ${lowerFirst(blogs.tech.tagline)}. Outside work, he also keeps a personal comic fan blog.`,
    },
    {
      target: 'contact',
      text: `If you'd like to talk to ${FIRST}, his email and LinkedIn are right here. That concludes the tour. What would you like to know more about?`,
    },
  ]
}

// Domain graph nodes (see components/GraphView.jsx): a spoken explanation built from the graph
// data, so it's instant and works offline, plus questions for the profile agent to go deeper.
const list = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)
const count = (n, word) => (n === 1 ? `one ${word}` : `${n} ${word}s`)

export function explainNode(n) {
  if (n.type === 'root') {
    const verticals = [...new Set(graphProjects.map((p) => p.vertical))]
    return `This is ${FIRST}'s domain graph. It maps ${count(graphProjects.length, 'project')} across ${verticals.length} verticals, ${list(verticals)}, and the technologies behind each. Select any node and I'll explain it.`
  }
  if (n.type === 'project') {
    const p = n.project
    return `${p.name}: ${/^[aeiou]/i.test(p.vertical) ? 'an' : 'a'} ${p.vertical} project in ${list(p.domains)}. ${p.text}${p.tech.length ? ` Key technologies: ${list(p.tech)}.` : ''}`
  }
  if (n.type === 'tech') {
    const used = graphProjects.filter((p) => p.tech.includes(n.label))
    return `${n.label}. ${FIRST} has used it in ${count(used.length, 'project')}: ${list(used.map((p) => p.name))}.`
  }
  const work = n.children.map((c) => c.project)
  const tech = [...new Set(work.flatMap((p) => p.tech))]
  return (
    `${n.label}. In this ${n.type}, ${FIRST} has delivered ${count(work.length, 'project')}: ${list(work.map((p) => p.name))}.` +
    (tech.length ? ` The work draws on ${list(tech.slice(0, 6))}${tech.length > 6 ? ', among others' : ''}.` : '')
  )
}

export function nodeQuestions(n) {
  if (n.type === 'root') return [`Who is ${FIRST}?`, 'Show his career timeline', 'What impact has he had?']
  if (n.type === 'project') return [`What was his role in ${n.project.short}?`, `What impact did ${n.project.short} have?`]
  if (n.type === 'tech') return [`How has he used ${n.label}?`, `Which projects used ${n.label}?`]
  return [`What has he built in ${n.label}?`, `Which technologies does he use for ${n.label}?`]
}

// The 30-second brief (components/Brief.jsx), narrated one segment at a time. Each segment's
// target matches a data-brief="…" element in the brief, which VINCE highlights as he speaks it.
// text is shown in VINCE's log; speech is what he says (toSpeech, plus acronyms spelled out,
// handled here so lines toSpeech already prepares for the server stay unchanged).
const spoken = (text) =>
  toSpeech(text)
    .replace(/\bIoT\b/g, 'I O T')
    .replace(/\b(MDM|EMM)\b/g, (m) => m.split('').join(' '))
    .replace(/\s\/\s/g, ' and ')
    .replace(/\b([A-Z])([A-Z]{4,})\b/g, (_, a, b) => a + b.toLowerCase()) // PRESTO is a name, not letters
    .replace(/([a-z])([A-Z])/g, '$1 $2') // VusionGroup → Vusion Group

// Short narration of each stat (keyed by stats[].value): [shown text, spoken form]. A stat without an
// entry falls back to "value label". The whole brief stays at about 75 spoken words (30 seconds).
const STAT_LINES = {
  '35+': ['35+ engineers led', 'thirty-five plus engineers led'],
  '100%': ['100% on-time milestones', 'a hundred percent on-time milestones'],
  '3 wk → 5 days': ['releases from 3 weeks to 5 days', 'releases from three weeks to five days'],
  '8': ['8 senior hires', 'eight senior hires'],
}
const NUMBER_WORDS = { 3: 'three' } // e.g. availability.notice '3 months' -> "three months'"

export function briefNarration() {
  const card = Object.fromEntries(profileCard)
  const proof = stats.map((s, i) => {
    const [text, speech] = STAT_LINES[s.value] || [`${s.value} ${lowerFirst(s.label)}`]
    const pre = i === 0 ? 'In numbers: ' : i === stats.length - 1 ? 'and ' : ''
    const end = i === stats.length - 1 ? '.' : ','
    return { text: pre + text + end, speech: speech && pre + speech + end }
  })
  const [n, unit] = availability.notice.split(' ') // '3 months'
  const notice = `${NUMBER_WORDS[n] || n} ${unit}'` // "three months'"
  const segments = [
    { target: 'name', text: `${profile.name}, ${profile.role} at ${profile.company}.` },
    showAvailability && {
      target: 'availability',
      text: `Open to ${list(availability.roles)} roles; ${notice} notice${availability.relocation ? '; will relocate' : ''}.`,
    },
    { target: 'signals', text: `${card.experience}' experience.` },
    ...proof.map((p, i) => ({ target: `stat-${i}`, ...p })),
    { target: 'projects', text: `Projects: ${list(projects.slice(0, 3).map(project))}.` },
    { target: 'domains', text: `Domains: ${list(profile.domains)}.` },
    { target: 'actions', text: 'You can email him or connect on LinkedIn.' },
  ].filter(Boolean)
  return segments.map((s) => ({ ...s, speech: s.speech ? spoken(s.speech) : spoken(s.text) }))
}
