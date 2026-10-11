// Role-fit matcher: compares a pasted job description (JD) with Vinod's profile in src/data.js.
// Pure functions, no React, nothing leaves the browser. Every evidence line is text from data.js.
//
// How it works:
// 1. Terms = the curated recruiter lexicon (fitLexicon.js) + skills and technologies named in
//    data.js that the lexicon doesn't cover (CopilotKit, AG-UI, Dagger 2...).
// 2. Each term gets word-boundary regexes (case-insensitive, except English-word names like
//    'Go', 'Swift', 'React'), so 'Go' doesn't match 'good', 'Java' doesn't match 'JavaScript'
//    and 'C' doesn't match 'CI/CD' or 'R&D'.
// 3. Texts are scanned longest-match-first, so 'React Native' isn't also counted as 'React' and
//    'Azure DevOps' isn't also 'Azure'. The same scan finds terms in the JD and evidence in the data.
// 4. A JD term with evidence is a strong match; without evidence but with an evidenced `related`
//    term it's related experience; otherwise it's "not evident in the profile". No score, no verdict.
import { profile, stats, highlights, experience, projects, graphProjects, graphDomains, otherProjects, skills, certifications } from '../data.js'
import { LEXICON } from './fitLexicon.js'

export const MIN_WORDS = 20

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (s) => s.toLowerCase().replace(/[\s.\-_/]+/g, '')

// Word-boundary pattern: letters/digits can't touch either side; '+' and '#' can't follow ('C++', 'C#').
// Spaces match spaces or hyphens ('React Native', 'cross functional'), and a plural 's'/'es' is allowed.
function termRegex(term, cs) {
  const body = escapeRe(term).replace(/\\-/g, '[\\s-]?').replace(/ +/g, '[\\s-]+')
  const plural = /[a-z]$/i.test(term) && term.length > 2 ? '(?:e?s)?' : ''
  return new RegExp(`(?<![A-Za-z0-9])${body}${plural}(?![A-Za-z0-9+#])`, cs ? 'g' : 'gi')
}

function compile(entry) {
  const jd = [
    entry.re ? new RegExp(entry.re, entry.cs ? 'g' : 'gi') : termRegex(entry.label, entry.cs),
    ...(entry.aliases || []).map((a) => termRegex(a, false)),
    ...(entry.exact || []).map((a) => termRegex(a, true)),
  ]
  return { ...entry, jd, data: [...jd, ...(entry.also || []).map((a) => termRegex(a, false))] }
}

// Skills and technologies named in data.js, split into single terms:
// 'Android (Kotlin, Java, Jetpack Compose)' -> Android, Kotlin, Java, Jetpack Compose; 'Agile/Scrum' -> Agile, Scrum.
function dataTerms() {
  const out = []
  const add = (t, cat) => t && out.push({ label: t.trim(), cat })
  for (const s of skills) {
    for (const item of s.items) {
      const m = item.match(/^(.*?)\s*\((.*)\)$/)
      const parts = m ? [m[1], ...m[2].split(',')] : [item]
      for (const p of parts) p.split(/\s*&\s*|(?<=\w)\/(?=\w)/).forEach((t) => add(t, s.area))
    }
  }
  for (const g of graphProjects) g.tech.forEach((t) => add(t, 'Technology'))
  graphDomains.forEach((d) => add(d, 'Domain'))
  graphProjects.forEach((g) => add(g.vertical, 'Domain'))
  return out
}

function buildTerms() {
  const known = new Set()
  const lexicon = LEXICON.map((e) => {
    ;[e.label, ...(e.aliases || []), ...(e.exact || [])].forEach((t) => known.add(norm(t)))
    return compile({ ...e, source: 'lexicon' })
  })
  const extra = []
  for (const t of dataTerms()) {
    if (known.has(norm(t.label))) continue
    known.add(norm(t.label))
    extra.push(compile({ label: t.label, cat: t.cat, source: 'data' }))
  }
  return [...lexicon, ...extra]
}

// Every term occurrence in `text`, longest first and non-overlapping. Lexicon terms win over
// data-only terms, so 'Claude AI Agents' (a skills item) doesn't hide 'Claude' and 'AI agents'.
function scan(text, terms, mode) {
  const found = []
  for (const t of terms) {
    for (const re of t[mode]) {
      re.lastIndex = 0
      for (const m of text.matchAll(re)) found.push({ term: t, start: m.index, end: m.index + m[0].length })
    }
  }
  const rank = (f) => (f.term.source === 'lexicon' ? 1 : 0)
  found.sort((a, b) => rank(b) - rank(a) || b.end - b.start - (a.end - a.start) || a.start - b.start)
  const kept = []
  for (const f of found) {
    const clash = kept.some((k) => f.start < k.end && k.start < f.end && !(k.start === f.start && k.end === f.end))
    if (!clash) kept.push(f)
  }
  return kept.sort((a, b) => a.start - b.start)
}

// Places evidence can come from, most specific first (priority), then in data.js order (newest first).
function buildCorpus() {
  const projectHeads = new Set(projects.map((p) => p.name.split(' – ')[0]))
  return [
    ...experience.flatMap((e) => e.points.map((text) => ({ text, where: `${e.company} · ${e.period}`, priority: 3 }))),
    ...projects.map((p) => ({ text: p.text, where: p.name, priority: 3 })),
    ...graphProjects
      .filter((g) => !projectHeads.has(g.name.split(' – ')[0]))
      .map((g) => ({ text: g.text, where: g.name, priority: 2 })),
    ...highlights.map((h) => ({ text: h.text, where: `Highlight · ${h.title}`, priority: 2 })),
    ...otherProjects.map((text) => ({ text, where: 'Other notable projects', priority: 1 })),
    ...profile.summary.split(/(?<=\.)\s+/).map((text) => ({ text, where: 'Profile summary', priority: 1 })),
    ...skills.map((s) => ({ text: `${s.area}: ${s.items.join(', ')}`, where: 'Technical skills', priority: 1 })),
    ...certifications.map((text) => ({ text, where: 'Certifications', priority: 1 })),
  ]
}

let cache
function index() {
  if (cache) return cache
  const terms = buildTerms()
  const corpus = buildCorpus()
  const evidence = new Map() // label -> evidence items, best first
  corpus.forEach((item, order) => {
    const seen = new Set()
    for (const f of scan(item.text, terms, 'data')) {
      if (seen.has(f.term.label)) continue
      seen.add(f.term.label)
      if (!evidence.has(f.term.label)) evidence.set(f.term.label, [])
      evidence.get(f.term.label).push({ text: item.text, where: item.where, priority: item.priority, order })
    }
  })
  for (const list of evidence.values()) list.sort((a, b) => b.priority - a.priority || a.order - b.order)
  const byLabel = new Map(terms.map((t) => [t.label, t]))
  cache = { terms, evidence, byLabel }
  return cache
}

const clean = ({ text, where }) => ({ text, where })

// Leadership and seniority wording in the JD, and the profile lines that speak to it.
const SIGNALS = [
  ['manage', /\bmanag(?:e|es|er|ers|ing)\b|\b(?:people|team|engineering|line) management\b/i],
  ['lead', /\blead(?:s|er|ers|ership|ing)?\b/i],
  ['director', /\bdirector\b/i],
  ['head of', /\bhead of\b/i],
  ['team of', /\bteams? of\b/i],
  ['direct reports', /\b(?:direct )?reports\b/i],
  ['stakeholders', /\bstakeholders?\b/i],
  ['hiring', /\b(?:hiring|hire|recruit\w*)\b/i],
  ['mentoring', /\b(?:mentor\w*|coach\w*)\b/i],
  ['budget', /\bbudget\w*\b/i],
]
const LEAD_EVIDENCE = [
  { when: () => true, find: () => ({ text: highlights[0].text, where: `Highlight · ${highlights[0].title}` }) },
  { when: () => true, find: () => ({ text: `${stats[0].value} ${stats[0].label.toLowerCase()}`, where: 'At a glance' }) },
  { when: (s) => s.some((x) => ['manage', 'lead', 'director', 'head of', 'team of', 'direct reports'].includes(x)), re: /managing a team of/i },
  { when: (s) => s.includes('hiring'), re: /\bhiring\b/i },
  { when: (s) => s.includes('stakeholders'), re: /\bstakeholder/i },
  { when: (s) => s.includes('mentoring'), re: /\bmentored\b/i },
  { when: (s) => s.includes('budget'), re: /\bbudget\b/i },
]
function leadershipEvidence(signals) {
  const out = []
  for (const rule of LEAD_EVIDENCE) {
    if (!rule.when(signals)) continue
    if (rule.find) out.push(rule.find())
    else {
      const e = experience.find((x) => x.points.some((p) => rule.re.test(p)))
      if (e) out.push({ text: e.points.find((p) => rule.re.test(p)), where: `${e.company} · ${e.period}` })
    }
  }
  return out.filter((e, i) => out.findIndex((x) => x.text === e.text) === i)
}

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`

/**
 * Match a job description against the profile.
 * @returns {{ tooShort: boolean, words: number, strong: Array, related: Array, gaps: Array, leadership: object|null, summary: string }}
 */
export function matchRole(jd) {
  const text = String(jd || '')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const empty = { words, strong: [], related: [], gaps: [], leadership: null, summary: '' }
  if (words < MIN_WORDS) return { ...empty, tooShort: true }

  const { terms, evidence, byLabel } = index()
  const seen = new Set()
  const strong = []
  const related = []
  const gaps = []
  for (const f of scan(text, terms, 'jd')) {
    const t = f.term
    if (seen.has(t.label)) continue
    seen.add(t.label)
    const ev = evidence.get(t.label)
    if (ev?.length) {
      strong.push({ label: t.label, cat: t.cat, evidence: ev.slice(0, 3).map(clean), total: ev.length })
      continue
    }
    const via = (t.related || []).filter((l) => evidence.get(l)?.length && byLabel.has(l))
    if (via.length) {
      const ev2 = via.map((l) => evidence.get(l)[0]).filter((e, i, a) => a.findIndex((x) => x.text === e.text) === i)
      related.push({ label: t.label, cat: t.cat, via, evidence: ev2.slice(0, 2).map(clean) })
    } else if (t.source === 'lexicon') {
      gaps.push({ label: t.label, cat: t.cat })
    }
  }

  const signals = SIGNALS.filter(([, re]) => re.test(text)).map(([name]) => name)
  const leadership = signals.length ? { signals, evidence: leadershipEvidence(signals) } : null

  const summary = [
    `${plural(strong.length, 'requirement')} matched with evidence`,
    related.length ? `${related.length} related` : '',
    `${gaps.length} not evident in the profile`,
  ].filter(Boolean).join(' · ')

  return { tooShort: false, words, strong, related, gaps, leadership, summary }
}

/** Plain-text summary for the clipboard. */
export function fitSummaryText(result, resumeUrl = '') {
  const lines = [`Role fit notes for ${profile.name} (${profile.role}, ${profile.company})`, result.summary, '']
  if (result.strong.length) {
    lines.push('Matched with evidence:')
    for (const m of result.strong) {
      lines.push(`- ${m.label}`)
      for (const e of m.evidence) lines.push(`    ${e.text} (${e.where})`)
    }
    lines.push('')
  }
  if (result.related.length) {
    lines.push('Related experience:')
    for (const r of result.related) lines.push(`- ${r.label}: related evidence in ${r.via.join(', ')}`)
    lines.push('')
  }
  if (result.leadership) {
    lines.push('Leadership evidence:')
    for (const e of result.leadership.evidence) lines.push(`- ${e.text} (${e.where})`)
    lines.push('')
  }
  if (result.gaps.length) lines.push(`Not evident in the profile: ${result.gaps.map((g) => g.label).join(', ')}`, '')
  lines.push(`Contact: ${profile.email} · ${profile.linkedin}`)
  if (resumeUrl) lines.push(`Resume: ${resumeUrl}`)
  return lines.join('\n')
}

// Generic sample, not based on any real company's posting.
export const SAMPLE_JD = `Engineering Manager, Mobile & Connected Devices Platform

We are a growing technology company building a platform that connects mobile apps, IoT devices and cloud services for enterprise customers. We're looking for an Engineering Manager to lead a team of 15-25 engineers across Android, iOS and backend.

What you'll do:
- Manage and grow a cross-functional team: hiring, mentoring, performance reviews and career development.
- Own delivery of our mobile apps (Kotlin, Swift, React Native) and the APIs behind them.
- Drive the architecture of our device management (MDM) and IoT platform, including Bluetooth and NFC integrations.
- Improve CI/CD pipelines, release planning and reliability; partner with DevOps on AWS and Kubernetes.
- Work with product and business stakeholders to define the roadmap, OKRs and budget.
- Champion Agile/Scrum practices, code reviews and test automation.

What you bring:
- 10+ years in software engineering, including 4+ years managing engineers.
- Hands-on background in mobile and web development; experience with Python or Node.js is a plus.
- Exposure to AI/ML or LLM-based features and observability tooling (Grafana, Datadog) is a plus.
- Excellent communication with clients and senior leadership.`
