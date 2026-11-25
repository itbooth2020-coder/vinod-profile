// Owner decision (Nov 2026): the current program's client is named only as "a global bank". This file
// deliberately holds no form of the real name (no spelling, hash or other encoding; SEC-001): tests check
// behaviour instead. A text passes when every bank it mentions is "a global bank" (or "Global Bank", the
// project's title), so a named bank ("Northwind Bank", "Contoso Financial Group") is flagged. The release
// gate (scripts/check-dist.mjs) can also grep for the name itself from the CLIENT_NAME_PATTERN secret,
// which lives only in CI and the gitignored .env.

const NAMED_BANK = /\b(?!(?:A|An|The|Global|Our|His)\b)[A-Z][\w&.'-]*(?:[ \t]+[A-Z][\w&.'-]*)*[ \t]+(?:Bank|Bancorp|Banking Group|Financial(?:[ \t]+Group)?)\b/g

/** The named banks a text mentions (an empty list when it names none). "Global Bank" is the project's
 * title; textContent glues it to the previous element's text ("Application SecurityGlobal Bank"). */
export const namedBanks = (text) => (String(text).match(NAMED_BANK) || []).filter((m) => !/Global Bank$/.test(m))
