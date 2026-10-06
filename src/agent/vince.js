// VINCE: the voice assistant's persona, its follow-up questions and the guided-tour script.
// Everything here is built from src/data.js, so it stays in step with the resume.
import { profile, highlights, experience, projects, skills, education, blogs } from '../data.js'

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
const yearsIn = (period) => Math.round(when(period.split('–')[1]) - when(period.split('–')[0]))
const NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const YEARS = profile.tagline.match(/\d+\+?/)[0] // e.g. '14+'
const lowerFirst = (s) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)) // keeps acronyms like "AI"
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v)

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export function introduction() {
  return (
    `${greeting()}. I'm VINCE: ${EXPANSION}. Think of me as ${FIRST}'s own JARVIS. ` +
    `I know his ${YEARS} years of work inside out. ` +
    `What would you like to know about ${FIRST}? His experience, his projects, his skills? Or shall I take you on a guided tour?`
  )
}

export const welcomeBack = () => `Welcome back. How else may I help you with ${FIRST}'s profile?`

// A brief, butler-like acknowledgement spoken before each answer.
export const acknowledge = () => pick(['Certainly.', 'Of course.', 'Right away.', 'Very good.', 'Allow me.'])

// Questions VINCE can suggest, grouped by topic.
const QUESTIONS = {
  intro: [`Who is ${FIRST}?`, 'Give me a quick summary of his career'],
  role: ['What is his current role?', `What does he do at ${experience[0].company}?`],
  company: experience.slice(1, 5).map((e) => `What did he do at ${company(e.company)}?`),
  timeline: ['Show his career timeline', 'How has his career progressed?'],
  project: projects.map((p) => `Tell me about the ${project(p)} project`),
  ai: ['How does he use AI agents in his work?', 'Which AI tools and frameworks does he know?'],
  skills: skills.filter((s) => !/librar|method|architect/i.test(s.area)).map((s) => `What ${s.area} skills does he have?`),
  impact: ['What impact has he had?', 'What measurable results has he delivered?'],
  leadership: ['How large are the teams he has led?', 'How does he hire and mentor engineers?'],
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
  leadership: ['impact', 'role', 'contact'],
  education: ['certs', 'skills', 'timeline'],
  certs: ['ai', 'education', 'skills'],
  blogs: ['ai', 'skills', 'contact'],
  contact: ['blogs', 'location', 'impact'],
  location: ['role', 'contact', 'blogs'],
}

const names = (list) => list.map((s) => s.toLowerCase().split(/[\s.(]/)[0]).join('|')
// First match wins, so the more specific topics come first.
const DETECT = [
  ['contact', /contact|reach|e-?mail|linkedin|hire him|get in touch/],
  ['blogs', /blog|comic|batman|writes?\b|writing/],
  ['education', /stud(y|ied)|educat|degree|college|universit|mca|b\.?sc/],
  ['certs', /certif|course/],
  ['location', /\bbased\b|located|location|where (is|does) he live|city/],
  ['ai', /\bai\b|agent|claude|copilot|generative|llm|machine learning/],
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
  const order = [...RELATED[topic], ...shuffle(Object.keys(QUESTIONS))]
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
export function followUpLine([a, b]) {
  if (!a) return `Is there anything else you'd like to know about ${FIRST}?`
  if (!b) return `You might also ask: ${a}`
  return pick([
    `Shall I continue? You might ask: ${a} Or perhaps: ${b}`,
    `Where would you like to go from here? Perhaps: ${a} Or: ${b}`,
    `Is there anything else I can tell you? For instance: ${a} Or: ${b}`,
  ])
}

// Turns a Markdown answer into something worth hearing: visuals are mentioned, not read out,
// and long answers are cut at a sentence with a pointer to the screen.
export function toSpeech(md, max = 480) {
  let shown = false
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
      return ` I've put a table${rows > 0 ? ` of ${rows} rows` : ''} on screen. `
    })
    .replace(/!\[[^\]]*]\([^)]*\)/g, () => ((shown = true), ''))
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_`#>↗]/g, '')
    .replace(/^\s*[-•]\s+(.*)$/gm, '$1.')
    .replace(/(\d)\s*[–-]\s*(\d)/g, '$1 to $2')
    .replace(/https?:\/\/\S+/g, 'the link on screen')
    .replace(/(\d+)K\b/g, '$1 thousand')
    .replace(/(\d%?|thousand)\+/g, '$1 plus')
    .replace(/(\w)\/(\w)/g, '$1 and $2')
    .replace(/&/g, ' and ')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()

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
      target: 'experience',
      text: `His journey spans ${experience.length} companies. It began at ${company(first.company)} in ${startYear(first.period)}, ran through ${NUMBERS[yearsIn(experience[1].period)] || yearsIn(experience[1].period)} years at ${company(experience[1].company)}, and continues today at ${experience[0].company}, where he leads as ${experience[0].role}.`,
    },
    {
      target: 'projects',
      text: `Among his key projects: ${project(p1)}, an ${lowerFirst(p1.text.split('. ')[0])}. And ${project(p2)}, a ${lowerFirst(p2.text.split('. ')[0])}.`,
    },
    {
      target: 'skills',
      text: `On the technical side, his skills cover ${skills.map((s) => s.area.replace(' / ', ' and ')).join(', ').replace(/, ([^,]*)$/, ', and $1')}, from Kotlin and Swift to Claude AI agents.`,
    },
    {
      target: 'credentials',
      text: `He holds a ${education[0].split(' — ')[0].replace(/\s*\(.*\)/, '')} and a ${education[1].split(' — ')[0].replace(/\s*\(.*\)/, '')}, both from Mumbai.`,
    },
    {
      target: 'blogs',
      text: `Away from work, he writes two blogs: ${blogs.tech.name}, ${lowerFirst(blogs.tech.tagline)}, and ${blogs.comic.name}, ${lowerFirst(blogs.comic.tagline)}.`,
    },
    {
      target: 'contact',
      text: `If you'd like to talk to ${FIRST}, his email and LinkedIn are right here. That concludes the tour. What would you like to know more about?`,
    },
  ]
}
