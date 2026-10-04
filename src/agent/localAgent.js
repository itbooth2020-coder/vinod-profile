// Offline fallback agent: keyword retrieval over the resume data in src/data.js.
// Used when the live Claude agent (/api/ask) isn't available, e.g. on static hosting.
import { profile, highlights, experience, projects, otherProjects, skills, certifications, education, languages } from '../data.js'

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
  { title: 'Current role job accenture', text: `${profile.name} is currently ${profile.role} at ${profile.company} (${experience[0].period}), based in ${profile.location}. ${experience[0].points.slice(0, 3).join(' ')}` },
  { title: 'Impact highlights achievements', text: highlights.map((h) => `${h.title}: ${h.text}.`).join(' ') },
  ...experience.map((e) => ({
    title: `${e.company} ${e.role} experience career history`,
    text: `${e.role} at ${e.company}, ${e.location} (${e.period}). ${e.points.join(' ')}`,
  })),
  ...projects.map((p) => ({ title: `${p.name} ${p.tag} project`, text: `${p.name} (${p.tag}): ${p.text}` })),
  { title: 'Other notable projects portfolio', text: `Other notable projects: ${otherProjects.join(', ')}.` },
  ...skills.map((s) => ({ title: `${s.area} skills technologies stack`, text: `${s.area}: ${s.items.join(', ')}.` })),
  { title: 'Certifications courses learning', text: `Certifications: ${certifications.join('; ')}.` },
  { title: 'Education degree college university', text: `Education: ${education.join('; ')}.` },
  { title: 'Languages spoken', text: `Languages: ${languages.join(', ')}.` },
  { title: 'Contact email linkedin reach hire location', text: `You can reach Vinod by email at ${profile.email} or on LinkedIn: ${profile.linkedin}. He is based in ${profile.location}.` },
].map((c) => ({ ...c, titleTokens: new Set(tokenize(c.title)), textTokens: tokenize(c.text) }))

export function answerLocally(question) {
  const base = tokenize(question)
  const terms = new Set(base.flatMap((t) => [t, ...tokenize(SYNONYMS[t] || '')]))
  // Questions made only of stop words ("Who is Vinod?") get the summary.
  if (!terms.size) return profile.summary

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
    return `The resume doesn't cover that. You can ask Vinod directly at ${profile.email} or on LinkedIn.`
  }
  // Skill questions get every matching skill area; anything else gets the best two passages.
  const limit = scored[0].c.titleTokens.has('skills') ? skills.length : 2
  const top = scored.filter((x) => x.score >= scored[0].score * 0.6).slice(0, limit)
  return top.map((x) => x.c.text).join('\n\n')
}
