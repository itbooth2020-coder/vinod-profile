// Offline fallback agent: rich answers (images, tables, charts) for common requests,
// then keyword retrieval over the resume data in src/data.js.
// Used when the live Claude agent (/api/ask) isn't available, e.g. on static hosting.
// Answers use the same Markdown subset as the live agent (see components/RichText.jsx).
import { profile, highlights, experience, projects, otherProjects, skills, certifications, education, languages, blogs } from '../data.js'

const STOP = new Set('a an the and or of to in on for with by at is are was were be has have had do does did he his him vinod yadav pyarelal what which who whom how tell me about can could would you your please give list any some there their it its this that from as into than then'.split(' '))

const SYNONYMS = {
  job: 'role current accenture',
  work: 'experience role',
  stack: 'skills technologies',
  tech: 'skills technologies',
  technologies: 'skills',
  ai: 'agents claude copilotkit darwin generative',
  mdm: 'device management emm',
  iot: 'devices connected sensor',
  contact: 'email linkedin reach',
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
  speak: 'languages',
  located: 'location bengaluru',
  live: 'location bengaluru',
}

const tokenize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9+#./ ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w))

const chunks = [
  { title: 'Who is Vinod summary overview introduce', text: profile.summary },
  { title: 'Current role job accenture', text: `${profile.name} is currently ${profile.role} at ${profile.company} (${experience[0].period}), based in ${profile.location}. ${experience[0].points.slice(0, 3).join(' ')}`, media: experience[0].media, label: profile.company },
  { title: 'Impact highlights achievements', text: highlights.map((h) => `${h.title}: ${h.text}.`).join(' ') },
  ...experience.map((e) => ({
    title: `${e.company} ${e.role} experience career history`,
    text: `${e.role} at ${e.company}, ${e.location} (${e.period}). ${e.points.join(' ')}`,
    media: e.media,
    label: e.company,
  })),
  ...projects.map((p) => ({ title: `${p.name} ${p.tag} project`, text: `${p.name} (${p.tag}): ${p.text}`, media: p.media, label: p.name })),
  { title: 'Other notable projects portfolio', text: `Other notable projects: ${otherProjects.join(', ')}.` },
  ...skills.map((s) => ({ title: `${s.area} skills technologies stack`, text: `${s.area}: ${s.items.join(', ')}.` })),
  { title: 'Certifications courses learning', text: `Certifications: ${certifications.join('; ')}.` },
  { title: 'Education degree college university', text: `Education: ${education.join('; ')}.` },
  { title: 'Languages spoken', text: `Languages: ${languages.join(', ')}.` },
  { title: 'Contact email linkedin reach hire location', text: `You can reach Vinod by email at ${profile.email} or on LinkedIn: ${profile.linkedin}. He is based in ${profile.location}.` },
].map((c) => ({ ...c, titleTokens: new Set(tokenize(c.title)), textTokens: tokenize(c.text) }))

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

const PROJECT_NAMES = /\b(darwin|presto|vusion|meijer|meta|intelity|bayer|elder|clinic)\b/

// Requests that read better as links, images, tables or charts than as text. First match wins.
const RICH = [
  {
    test: (q) => /\b(blogs?|blogging|articles?|writes?|writing|comics?|batman|android ?super ?nerds)\b/.test(q),
    answer: () =>
      `${profile.firstName} writes two blogs:\n\n` +
      table(['Blog', 'About'], [
        [`**${blogs.tech.name}**`, blogs.tech.description],
        [`**${blogs.comic.name}**`, blogs.comic.description],
      ]) +
      `\n\n[Read ${blogs.tech.name} ↗](${blogs.tech.url})\n\n[Read ${blogs.comic.name} ↗](${blogs.comic.url})`,
  },
  {
    test: (q) => /\b(linked\s?in|contact|reach|connect|hire|email|e-mail|mail)\b/.test(q),
    answer: (q) => {
      const linkedin = `[Open LinkedIn profile ↗](${profile.linkedin})`
      const email = `[Email ${profile.firstName.split(' ')[0]}](mailto:${profile.email})`
      return /linked\s?in/.test(q)
        ? `Here is ${profile.firstName}'s LinkedIn profile; it opens in a new tab.\n\n${linkedin}\n\nYou can also email him at ${profile.email}.`
        : `You can reach ${profile.firstName} by email at ${profile.email} or on LinkedIn.\n\n${email}\n\n${linkedin}`
    },
  },
  {
    test: (q) => /\b(timeline|journey|work history)\b|career (path|history|graph|chart)|\b(graph|chart|visuali[sz]e)\b.*\b(career|experience|jobs?|roles?)\b/.test(q),
    answer: () =>
      `Here is ${profile.firstName}'s career timeline across ${experience.length} roles, from 2011 to today.\n\n` +
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
    answer: () =>
      `${profile.firstName} has worked at ${experience.length} companies:\n\n` +
      experience.map((e) => img(e.media, e.company)).join(' ') +
      '\n\n' +
      table(['Company', 'Role', 'Period', 'Location'], experience.map((e) => [`**${e.company}**`, e.role, e.period, e.location])),
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
      `\n\n${profile.firstName} is based in **${profile.location}**, India. A street address isn't shared publicly; reach him by [email](mailto:${profile.email}) or [LinkedIn](${profile.linkedin}).`,
  },
  {
    test: (q) => !PROJECT_NAMES.test(q) && /\b(photos?|pics?|pictures?|images?|headshot|avatar)\b|looks? like/.test(q),
    answer: () => img('profile', profile.name) + `\n\n${profile.name}, ${profile.role} at ${profile.company}, based in ${profile.location}.`,
  },
  {
    test: (q) => !PROJECT_NAMES.test(q) && /\b(projects|portfolio)\b/.test(q),
    answer: () =>
      projects.map((p) => img(p.media, p.name.split(' – ')[0])).join(' ') +
      '\n\n' +
      table(['Project', 'Area', 'Highlights'], projects.map((p) => [`**${p.name}**`, p.tag, p.text.split('. ')[0].replace(/\.$/, '') + '.'])) +
      `\n\nAlso: ${otherProjects.join(', ')}.`,
  },
  {
    test: (q) => /\b(skills?|stack|technolog\w*|tech|tools)\b/.test(q),
    answer: () => table(['Area', 'Technologies'], skills.map((s) => [`**${s.area}**`, s.items.join(', ')])),
  },
]

export function answerLocally(question) {
  const q = question.toLowerCase()
  const rich = RICH.find((r) => r.test(q))
  if (rich) return rich.answer(q)

  const base = tokenize(question)
  const terms = new Set(base.flatMap((t) => [t, ...tokenize(SYNONYMS[t] || '')]))
  // Questions made only of stop words ("Who is Vinod?") get the photo and summary.
  if (!terms.size) return img('profile', profile.name) + '\n\n' + profile.summary

  const scored = chunks
    .map((c) => {
      let score = 0
      for (const t of terms) {
        if (c.titleTokens.has(t)) score += 3
        score += c.textTokens.filter((w) => w === t || (t.length > 3 && w.startsWith(t))).length
      }
      return { c, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) {
    return `The resume doesn't cover that. You can ask Vinod directly at [${profile.email}](mailto:${profile.email}) or on [LinkedIn](${profile.linkedin}).`
  }
  // Skill questions get every matching skill area; anything else gets the best two passages.
  const limit = scored[0].c.titleTokens.has('skills') ? skills.length : 2
  const top = scored.filter((x) => x.score >= scored[0].score * 0.6).slice(0, limit)
  // Lead with the matching company or project image when there is one.
  const lead = top[0].c.media ? img(top[0].c.media, top[0].c.label) + '\n\n' : ''
  return lead + top.map((x) => x.c.text).join('\n\n')
}
