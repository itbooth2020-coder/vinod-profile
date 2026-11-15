import { createHash } from 'node:crypto'

// Owner decision (Nov 2026): the current program's client is named only as "a global bank", and its
// real name appears nowhere in the site or this repository (grep is part of the release check). Tests
// that check for its absence compare SHA-256 hashes of each word with the hashes of the name's
// spellings below, so the name itself isn't written here. The agent has no name-specific logic, so
// tests that ask VINCE about a bank use stand-in names (BANK_NAMES).
const CLIENT_HASHES = new Set([
  '2ad55da5b6ea629b63bb69897af38deb8e161cee640dd671484d741cd4305df5',
  '4b1f6f530975ef68d8f30d663efe02fb1e20ca2fdde8c5416ecfeb21fb881e96',
  'd1d760dba0da539cc4f9d3dc25966cecc3c785aff7a23298c7057028b8c5e1df',
  'd992af593712c17fcc0c6801aa723b580399302c61d883506b2789d9a8bc5196',
])
const sha = (w) => createHash('sha256').update(w).digest('hex')

/** true when the text names the client (any case; "Name's" counts). */
export const namesClient = (text) => (String(text).toLowerCase().match(/[a-z]+/g) || []).some((w) => CLIENT_HASHES.has(sha(w)))

// Made-up and real bank names a visitor might type, in the wordings the UAT used.
export const BANK_NAMES = ['Examplebank', 'Northwind Bank', 'Contoso Financial Group', 'HSBC']
