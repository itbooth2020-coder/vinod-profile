// Concept matching for the offline agent (AI-003). A question is normalised (lower case, no
// punctuation, simple stemming), then mapped to CONCEPTS through a vocabulary of synonyms and word
// forms: "begin", "joining", "start date" and "how soon" all carry `start`; "moving abroad",
// "relocation" and "overseas" all carry `relocate`. Intents in localAgent.js are scored by the
// concepts a question carries, so a new wording of a known question still finds its answer.
//
// Vocabulary terms go through the same stemmer as the question, so list base forms; a term can be
// a phrase ("notice period"), use `*` for a gap of up to three words ("how big * team"), end in `*`
// to match a word prefix ("underperform*"), or start with `=` to match an exact, unstemmed word.

// Irregular forms the suffix rules can't reach.
const IRREGULAR = {
  began: 'begin', begun: 'begin', led: 'lead', left: 'leave', grew: 'grow', grown: 'grow', taught: 'teach',
  built: 'build', ran: 'run', went: 'go', gone: 'go', did: 'do', does: 'do', done: 'do', doing: 'do',
  has: 'have', had: 'have', having: 'have', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', am: 'be',
  wrote: 'write', written: 'write', spoke: 'speak', spoken: 'speak', got: 'get', made: 'make', took: 'take',
  taken: 'take', brought: 'bring', sought: 'seek', thought: 'think', children: 'child', men: 'man', women: 'woman',
}

const undouble = (s) => (/([bdfgmnprt])\1$/.test(s) ? s.slice(0, -1) : s)

function regular(w) {
  if (w.length <= 3 || /\d/.test(w)) return w
  let s = w
  if (/ies$/.test(s) && s.length > 4) s = s.slice(0, -3) + 'y'
  else if (/ied$/.test(s) && s.length > 4) s = s.slice(0, -3) + 'y'
  else if (/(ss|us|is)$/.test(s)) return s
  else if (/ing$/.test(s) && s.length > 5) s = undouble(s.slice(0, -3))
  else if (/ed$/.test(s) && s.length > 4) s = undouble(s.slice(0, -2))
  else if (/ly$/.test(s) && s.length > 5) s = s.slice(0, -2)
  else if (/(ch|sh|x)es$/.test(s)) s = s.slice(0, -2)
  else if (/s$/.test(s)) s = s.slice(0, -1)
  if (/ation$/.test(s)) s = s.slice(0, -3) // relocation → relocat
  else if (/e$/.test(s) && s.length > 3) s = s.slice(0, -1) // move/moving/moved → mov
  return s
}

export const stem = (w) => (IRREGULAR[w] ? regular(IRREGULAR[w]) : regular(w))

// Lower case, accents and punctuation removed, a few spellings unified, then split into words.
export function words(text) {
  return (
    ' ' +
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[’`]/g, "'")
      .replace(/\btl\s*;?\s*dr\b/g, ' tldr ')
      .replace(/&/g, ' and ')
      .replace(/'s\b/g, '')
      .replace(/[^a-z0-9+#]+/g, ' ') +
    ' '
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

// One compiled term: a list of parts, each { gap } or { prefix } or { exact } or { stem }.
function compileTerm(term) {
  return term.split(/\s+/).map((p) =>
    p === '*' ? { gap: true }
    : p.startsWith('=') ? { exact: p.slice(1) }
    : p.endsWith('*') ? { prefix: stem(p.slice(0, -1)) }
    : { stem: stem(p) },
  )
}

const GAP = 3
function matchAt(parts, raw, stems, i, k = 0) {
  if (k === parts.length) return true
  const p = parts[k]
  if (p.gap) {
    for (let j = i; j <= Math.min(stems.length, i + GAP); j++) if (matchAt(parts, raw, stems, j, k + 1)) return true
    return false
  }
  if (i >= stems.length) return false
  const ok = p.exact ? raw[i] === p.exact : p.prefix ? stems[i].startsWith(p.prefix) : stems[i] === p.stem
  return ok && matchAt(parts, raw, stems, i + 1, k + 1)
}
const contains = (parts, raw, stems) => raw.some((_, i) => matchAt(parts, raw, stems, i))
// The word positions a term covers, wherever it matches (for the answer's confidence, localAgent.js).
function spansOf(parts, raw, stems) {
  const out = new Set()
  const walk = (i, k, path) => {
    if (k === parts.length) return path.forEach((j) => out.add(j)), true
    const p = parts[k]
    if (p.gap) {
      let ok = false
      for (let j = i; j <= Math.min(stems.length, i + GAP); j++) ok = walk(j, k + 1, path) || ok
      return ok
    }
    if (i >= stems.length) return false
    const hit = p.exact ? raw[i] === p.exact : p.prefix ? stems[i].startsWith(p.prefix) : stems[i] === p.stem
    return hit && walk(i + 1, k + 1, [...path, i])
  }
  raw.forEach((_, i) => walk(i, 0, []))
  return out
}

// Word families used to build phrase variants: 'kind of position', 'how large * org'…
const ROLE_NOUNS = ['role', 'job', 'position', 'opportunity', 'title', 'opening', 'post']
const TEAM_NOUNS = ['team', 'org', 'organisation', 'organization', 'department', 'group', 'unit']
const cross = (as, bs, join = ' ') => as.flatMap((a) => bs.map((b) => `${a}${join}${b}`))

// Concept vocabulary: what a question can be about, by every wording we expect for it.
export const CONCEPTS = {
  // Availability and the next role
  // "Onboard" only with Vinod as the one joining ("onboard him", "when can he be onboarded", "come on
  // board"): device, user or employee onboarding is one of his impact metrics, not a start date.
  start: ['start', 'begin', 'commence', 'join', 'onboard him', 'onboard vinod', 'he be onboard', 'he get onboard', 'come on board', 'come onboard', 'get him on board', 'get him onboard', 'start date', 'joining date', 'how soon', 'when can he', 'when could he', 'when would he', 'when will he', 'immediate joiner', 'immediately', 'asap', 'right away'],
  pastStart: ['when did * start', 'when did * begin', 'when did * join', 'did he start', 'did he begin', 'did he join', 'has he start', 'since when'],
  notice: ['notice', 'notice period', 'serving notice', 'buyout', 'buy out', 'lead time'],
  available: ['available', 'availability', '=free to'],
  open: ['open to', 'open for', '=offers', 'job offer', 'entertain*', 'accept * offer', 'take * offer', 'looking for', 'job hunting', 'job search', 'on the * market', 'job market', 'actively look', 'interested in * role', 'interested in * job', 'interested in * opportunit*', 'interested in * position', 'new opportunit*', 'opportunities', 'new role', 'new job', 'new position', 'change job', 'job change', 'consider * role', 'consider * offer', 'consider * job', 'consider * position', 'consider * opportunit*', 'up for * role', 'next opportunit*'],
  relocate: ['relocate', 'relocation', 'move to', 'move abroad', 'move overseas', 'move countr*', 'move cit*', 'willing to move', 'open to move', 'abroad', 'overseas', 'international', 'another country', 'other country', 'different country', 'other countries', 'outside india', 'emigrate', 'migrate', 'visa', 'work permit', 'shift to', 'another city', 'different city'],
  workmode: ['remote', 'hybrid', 'onsite', 'on site', 'in office', 'office', 'from home', 'wfh', 'in person', 'work mode', 'working arrangement'],
  // A role he wants, in person-role wording ("what role is he looking for", "next position", "target
  // title"), not any "what role" or "title" ("what role did the team take", "his title at HTC").
  target: ['target', ...cross(['kind of', 'type of', 'sort of', 'next', 'ideal', 'dream', 'target'], ROLE_NOUNS), ...cross(ROLE_NOUNS, ['be he look', 'be he seek', 'be he after', 'do he want', 'would he want', 'would suit', 'he want', 'he be look', 'he be seek', 'he be after'], ' '), 'what position', 'which position', 'next move', 'next step', 'aspire', 'aspiration', 'ambition', 'career goal', 'want to be', 'what * be he look', 'what * he look for', 'what * he after', 'be he after', 'next for him', 'next for vinod', 'what next', 'seek'],

  // Career history
  first: ['first', 'earliest', 'initial', 'oldest', ...cross(['start', 'begin', 'kick off', 'launch', 'take off'], ['career'], ' * '), ...cross(['career'], ['start', 'begin', 'kick off', 'launch', 'take off'], ' * '), 'start out', 'entry level', 'fresher', 'out of college', 'after college', 'first ever'],
  previous: ['previous', 'prior', 'former', 'last job', 'last role', 'last employer', 'before accenture', 'past employer', 'before join*', 'leave * to go', 'leave * to join', 'leave * for'],
  career: ['job', 'role', 'position', 'employer', 'company', 'career', 'gig', 'workplace', 'organisation', 'organization', 'firm', 'work'],
  current: ['currently', 'current', 'right now', 'at the moment', 'these days', 'nowadays', 'present role', 'present job', 'present position', 'present employer', 'where * he work', 'where do he work', 'who * he work for', 'who do he work for', 'employer now', 'do now', 'doing now', 'job now', 'role now'],

  // Level and experience
  level: ['director', 'vp', 'vice president', 'executive', 'c level', 'c suite', 'head of', 'level', 'seniority', 'how senior', 'principal', 'senior enough', 'grade', 'band'],
  directorQ: ['director', 'vp', 'vice president', 'executive', 'c level', 'c suite', 'head of'],
  years: ['how many year', 'year of experience', 'years experience', 'total experience', 'overall experience', 'professional experience', 'how long * =been', 'how experienced', 'experience level', 'career length', 'in the industry', 'in industry', 'in this field', 'in the field', 'how long * career', 'how long * work'],
  inIndustry: ['in the industry', 'in industry', 'this industry'],

  // People leadership
  mentor: ['mentor', 'mentorship', 'coach', 'grow * engineer', 'grow * people', 'grow * talent', 'grow * team', 'develop * engineer', 'develop * people', 'develop * talent', 'nurture', 'upskill', 'junior', 'guide * engineer', 'career growth', 'teach', 'train * engineer', 'train * people', 'people development'],
  hire: ['hire', 'recruit', 'interview', 'talent acquisition', 'build * team', 'staff * team', 'grow headcount'],
  hireHim: ['hire him', 'hire vinod', 'we hire', 'i hire', 'to hire', 'hiring him', 'recruit him', 'employ him', 'bring him on'],
  attrition: ['attrition', 'retention', 'retain', 'turnover', 'churn', 'morale', 'keep * engineer'],
  okr: ['okr', 'objective and key', 'set * goal', 'team goal', 'quarterly goal', 'performance review', 'review cycle', 'appraisal', 'underperform*', 'low perform*', 'poor perform*', 'one on one', '1 on 1', 'performance management'],
  teamSize: [...cross(TEAM_NOUNS, ['size']), ...cross(['size of', 'how big', 'how large', 'biggest', 'largest', 'big', 'large'], TEAM_NOUNS, ' * '), 'how many people', 'how many engineer', 'how many report', 'how many direct', 'direct report', 'span of control', 'number of engineer', 'number of people', 'how many * manage', 'how many * lead'],
  managers: ['manage * manager', 'manager of manager', 'managers of manager', 'lead * manager', 'manage * em'],
  ic: ['people manager', 'individual contributor', 'player coach', 'still code', 'write code', 'do he code', 'he still', 'vinod still', 'hands dirty', 'code himself', 'hands on code', 'hands on manager', 'program himself', 'still program', 'technical manager'],
  techLead: ['tech lead', 'technical lead', 'team lead', 'engineering lead', 'lead engineer', 'lead developer'],
  certs: ['certified', 'certification', 'certificate', 'accredited', 'accreditation', 'credential', 'course', 'udemy', 'coursiv'],
  budget: ['budget', 'p and l', 'pnl', 'profit and loss', 'cost', 'spend', 'financial', 'headcount plan*', 'resource allocation'],

  // Topics
  resume: ['resume', 'cv', 'curriculum vitae'],
  resumeSays: ['resume say', 'resume mention', 'resume cover', 'resume state', 'resume list', 'cv say', 'cv mention'],
  // Age and date of birth are never shared (owner decision); "Where was he born?" stays `personal`.
  age: ['how old', '=age', '=aged', 'year old', 'birthday', 'birth date', 'birthdate', 'date of birth', 'dob', 'year of birth', 'birth year', 'when * born', 'what year * born', 'born in what year', 'born on'],
  personal: ['married', 'marital', 'wife', 'husband', 'spouse', 'kid', 'child', 'religion', 'caste', 'born', 'family'],
  salary: ['salary', 'compensation', 'ctc', 'remuneration', 'pay', 'package', 'expected pay', 'wage', 'earn'],
  compare: ['rate him', 'rate vinod', 'rank him', 'score him', 'grade him', 'compare', 'versus', '=vs', 'evaluate', 'assess', 'better than'],
  whyLeave: ['why * leav*', 'why * left', 'why * quit*', 'why * look for', 'why * look', 'why * seek', 'why * chang*', 'why * switch*', 'why * mov*', 'why * want * new', 'why * open to', 'reason * leav*', 'reason * change', 'reason * switch', 'reason * move', 'reason * look'],
  phone: ['phone', 'telephone', 'cellphone', 'mobile number', 'mobile no', 'contact number', 'whatsapp', 'call him', 'call vinod', 'ring him'],
  ml: ['machine learning', '=ml', 'mlops', 'predictive model', 'predictive analytic', 'prediction model', 'model training', 'train * model', 'data science'],
  whyHire: ['why * hire', 'strength', 'stand out', 'standout', 'what make him', 'what make vinod', 'unique', 'best quality', 'differentiat*', 'sell me', 'value * bring', 'set him apart', 'special about'],
  fit: ['fit', 'match', 'suitable', 'qualified', 'right candidate', 'good candidate'],
  programming: ['programming language', 'coding language', 'language * code', 'language * program', 'language * develop', 'language * build', 'software language', 'computer language', 'language * write', 'program in', 'code in'],
  language: ['language'],
  speak: ['speak', 'fluent', 'mother tongue', 'hindi', 'marathi', 'english'],
  industry: ['industry', 'vertical', 'sector', 'domain'],
  // Writing as an author ("does he write a blog", "his writing", "published articles"), not any
  // "write" ("write unit tests", "write code").
  blog: ['blog', 'article', 'comic', 'batman', 'android super nerd*', 'androidsupernerd*', '=writing', '=writings', '=writer', 'write about', 'write * post', 'write * tutorial', 'publish', 'tutorial'],
  contact: ['linkedin', 'linked in', 'github', 'git hub', 'facebook', 'twitter', 'social', 'contact', 'reach him', 'reach vinod', 'reach out', 'to reach', 'can i reach', 'connect with', 'email', 'e mail', 'mail', 'get in touch', 'talk to him', 'speak to him', 'speak with him', 'message him', 'get hold', 'in touch'],
  timeline: ['timeline', 'journey', 'work history', 'career path', 'career history', 'career graph', 'career chart', 'career progress*', 'progress*', 'graph * career', 'chart * career', 'visuali* * career', 'graph * experience', 'chart * job'],
  impact: ['impact', 'metric', 'number', 'achievement', 'accomplish*', 'stats', 'statistic', 'improvement', 'kpi', 'result', 'biggest win', 'proudest', 'track record'],
  companies: ['company', 'companies', 'employer', 'organisation', 'organization', 'firm', 'worked at', 'worked for', 'work at', 'work for', 'where * he work before'],
  education: ['school', 'college', 'education', 'educational', 'study', 'degree', 'university', 'mca', 'mms', 'bsc', 'b sc', 'qualification', 'academic', 'graduat*'],
  location: ['address', 'located', 'location', 'live', 'based', 'city', 'hometown', 'where * he be', 'where * he live', 'where * he from', 'which city'],
  photo: ['photo', 'pic', 'picture', 'image', 'headshot', 'avatar', 'look like'],
  summary: ['summary', 'summarise', 'summarize', 'overview', 'introduce', 'introduction', 'background', 'who be', 'bio', 'biography', 'describe him', 'describe vinod', 'describe * himself', 'about him', 'about vinod', 'profile summary', 'snapshot'],
  // Short-answer words that also suggest a summary when nothing else is asked ('Give me a tl;dr on Vinod'),
  // but lose to a real topic ('tl;dr his availability'): they're length modifiers first (CHAT-003).
  summaryShort: ['pitch', 'tldr', 'one liner', 'oneliner', 'nutshell', 'sum * up', 'elevator'],
  pitch: ['pitch', 'elevator', 'sell him', 'sell vinod'],
  projects: ['=projects', 'portfolio', 'what * he build', 'what have he build', 'thing * he build', 'show * work', 'work sample', 'products * build'],
  devices: ['device', 'fleet', 'handset', 'endpoint'],
  mdm: ['mdm', 'emm', 'device management', 'mobility management', 'provision'],
  count: ['how many', 'number of', 'how much', 'scale', 'how large', 'how big'],
  llm: ['llm', 'large language model', 'gpt', 'chatgpt', 'openai', 'genai', 'generative ai', 'language model', 'model provider', 'ai vendor', 'llm vendor', 'vendor * agent', 'which model', 'foundation model', 'anthropic', 'claude'],
  agents: ['ai agent', 'agent', 'agentic', 'multi agent', 'orchestrat*', 'coding assistant', 'code assistant', 'ai assistant', 'ai coding', 'ai tool', 'copilot*', 'claude code'],
  ai: ['ai', 'artificial intelligence'],
  // A number asked about: "by how much did X drop", "what percent", "how many devices".
  measure: ['how much', 'by how much', 'what percent*', 'percentage', 'percent', 'by what', 'how many', 'faster', 'quicker', 'slower', 'speed up', 'reduce', 'reduction', 'cut', 'improve', 'improvement', 'increase', 'decrease', 'save', 'saving', 'drop', 'shorten'],
  // The client of a project ("the client for PRESTO", "which customer was it for").
  client: ['client', 'customer', 'who * for', 'for whom'],
  // A city ("employers in Bengaluru"); the cities themselves are matched in localAgent.js.
  city: ['city', 'cities', 'in which city', 'where * work'],
}

const COMPILED = Object.fromEntries(Object.entries(CONCEPTS).map(([k, terms]) => [k, terms.map(compileTerm)]))

// The set of concepts a question carries.
export function conceptsOf(text) {
  const raw = words(text)
  const stems = raw.map(stem)
  const found = new Set()
  for (const [k, terms] of Object.entries(COMPILED)) if (terms.some((t) => contains(t, raw, stems))) found.add(k)
  return found
}

// The question's words (as words() splits them), their stems, and for each concept it carries the
// positions of the words that matched it: { raw, stems, spans: Map(concept → Set of positions) }.
export function analyse(text) {
  const raw = words(text)
  const stems = raw.map(stem)
  const spans = new Map()
  for (const [k, terms] of Object.entries(COMPILED)) {
    const at = new Set()
    for (const t of terms) for (const i of spansOf(t, raw, stems)) at.add(i)
    if (at.size) spans.set(k, at)
  }
  return { raw, stems, spans }
}

// Length modifiers (CHAT-003): "in one sentence", "tl;dr", "briefly", "pitch him in two sentences".
// Returns the number of sentences wanted, or 0 when the question doesn't ask for a short answer.
const BRIEF = [
  [1, ['one sentence', 'single sentence', '1 sentence', 'in a sentence', 'one line', 'single line', '1 line', 'in a line', 'one liner', 'oneliner', 'tldr', 'one word', 'few word', 'in a word']],
  [3, ['three sentence', '3 sentence', 'three line', '3 line']],
  [2, ['two sentence', '2 sentence', 'two line', '2 line', 'couple of sentence', 'couple of line', 'briefly', 'brief', 'in short', 'short version', 'short answer', 'keep it short', 'nutshell', 'pitch', 'elevator', 'sum * up', 'quick summary', 'quick overview', 'short summary', 'quick intro', 'short intro']],
].map(([n, terms]) => [n, terms.map(compileTerm)])

export function brevity(text) {
  const raw = words(text)
  const stems = raw.map(stem)
  for (const [n, terms] of BRIEF) if (terms.some((t) => contains(t, raw, stems))) return n
  return 0
}
