// Release gate for the static site (SEC-007): fails when dist/ holds anything that must never be
// published. Run after `npm run build` (CI does, before any upload): `npm run check-dist`.
//   - a PDF or Word file (the resume is local-only), or a source map file or sourceMappingURL
//   - a phone-like number: 10+ digits in one run, optionally with +, spaces, dots, dashes or brackets
//   - hidden availability details (data.js availability while `public` is false; SEC-003)
//   - key-shaped secrets (Anthropic, AWS, private keys)
//   - the client's name, when CLIENT_NAME_PATTERN is set (a regular expression kept only in the CI
//     secret and the gitignored .env; never in the repo, SEC-001)
// Prints the file and the kind of problem only, never the matched text.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const FORBIDDEN_FILE = /\.(pdf|docx?|map)$/i
const TEXT_FILE = /\.(js|mjs|html|css|txt|xml|json|webmanifest|svg)$/i
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?){2,4}\d{3,5}/g
const AVAILABILITY = [
  /\bpublic\s*:\s*(?:!1|false)\s*,/, // the availability object with more than its switch
  /\bnotice\s*:\s*["'`]/, // a notice-period value (VINCE's lexicon has notice:[…] keywords, which are fine)
  /\brelocation\s*:\s*(?:!0|!1|true|false)\b/,
  /\bworkModes\s*:\s*\[/,
  /"(?:notice|relocation|workModes)"\s*:/,
  /\b\d+\s*(?:weeks?|months?|days?)['’]?\s+notice\b/i,
  /\bnotice(?: period)?(?: is| of)?\s*:?\s*\**\s*\d+\s*(?:weeks?|months?|days?)\b/i,
]
const SECRETS = /sk-ant-[\w-]{10,}|\bAKIA[0-9A-Z]{16}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })

// Phone-like runs in visible text: 10+ digits, not glued to a word or a hyphenated id (hashes, base64,
// "post-<id>"), and not right after a code operator (minified bit masks such as `e.flags&65011712`), so
// ids, asset names and numeric constants don't count.
export const phonesIn = (text) =>
  [...text.matchAll(PHONE)]
    .filter((m) => m[0].replace(/\D/g, '').length >= 10)
    .filter((m) => !/[\p{L}_-]/u.test(text[m.index - 1] || '') && !/[\p{L}_]/u.test(text[m.index + m[0].length] || ''))
    .filter((m) => !/[&|^~=<>!*/%]\s*$/.test(text.slice(Math.max(0, m.index - 3), m.index)))
    .map((m) => m[0])

// Where a phone number could hide in each kind of file. Minified JS is full of numeric constants (React's
// bit masks), so only its string literals are read, minus SVG path data; HTML loses its inline <svg>s.
const SVG_PATH = /^\s*[Mm][\d\s.,eE+-]*(?:[AaCcHhLlMmQqSsTtVvZz][\d\s.,eE+-]*)*$/
const STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g
export function readable(file, text) {
  if (/\.m?js$/i.test(file)) return (text.match(STRING) || []).map((s) => s.slice(1, -1)).filter((s) => !SVG_PATH.test(s)).join('\n')
  if (/\.(html|svg)$/i.test(file)) return text.replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/\sd="[^"]*"/g, ' ')
  return text
}

/** Problems found in `dir`, as "file: kind" lines (an empty list when it's clean). */
export function checkDist(dir, env = process.env) {
  let name = null
  if (env.CLIENT_NAME_PATTERN?.trim()) {
    try {
      name = new RegExp(`(?<![\\p{L}\\p{N}])(?:${env.CLIENT_NAME_PATTERN.trim()})(?![\\p{L}\\p{N}])`, 'iu')
    } catch {
      return ['CLIENT_NAME_PATTERN: not a valid regular expression']
    }
  }
  const bad = []
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).replace(/\\/g, '/')
    if (FORBIDDEN_FILE.test(file)) bad.push(`${rel}: forbidden file type`)
    if (!TEXT_FILE.test(file)) continue
    const text = readFileSync(file, 'utf8')
    if (/sourceMappingURL=/.test(text)) bad.push(`${rel}: source map reference`)
    if (phonesIn(readable(file, text)).length) bad.push(`${rel}: phone-like number`)
    if (AVAILABILITY.some((re) => re.test(text))) bad.push(`${rel}: availability details`)
    if (SECRETS.test(text)) bad.push(`${rel}: key-shaped secret`)
    if (name?.test(text)) bad.push(`${rel}: client name`)
  }
  return bad
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.resolve(root, process.argv[2] || 'dist')
  let bad
  try {
    bad = checkDist(dir)
  } catch (e) {
    console.error(`check-dist: cannot read ${dir} (${e.code || e.message}); run npm run build first`)
    process.exit(1)
  }
  if (bad.length) {
    console.error(`check-dist: ${bad.length} problem(s) in dist/:\n${bad.map((b) => `  ${b}`).join('\n')}`)
    process.exit(1)
  }
  const files = walk(dir).length
  console.log(`check-dist: ${files} files checked; no PDFs, source maps, phone numbers, availability details or secrets${process.env.CLIENT_NAME_PATTERN ? ', and no client name' : ' (CLIENT_NAME_PATTERN unset: client-name check skipped)'}`)
}
