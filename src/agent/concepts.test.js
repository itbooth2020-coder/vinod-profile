import { describe, expect, it } from 'vitest'
import { analyse, brevity, conceptsOf, stem, words } from './concepts.js'

describe('words (normalisation)', () => {
  it('lower-cases, strips accents and punctuation', () => {
    expect(words('Résumé, PLEASE!')).toEqual(['resume', 'please'])
  })

  it("drops possessive 's and keeps + and # in tech names", () => {
    expect(words("Vinod's C++ and C# work")).toEqual(['vinod', 'c++', 'and', 'c#', 'work'])
  })

  it('unifies curly apostrophes and & ', () => {
    expect(words('Vinod’s R&D')).toEqual(['vinod', 'r', 'and', 'd'])
  })

  it('normalises tl;dr spellings', () => {
    expect(words('TL;DR')).toEqual(['tldr'])
    expect(words('tl dr')).toEqual(['tldr'])
  })

  it('returns no words for empty or punctuation-only text', () => {
    expect(words('')).toEqual([])
    expect(words('?!…')).toEqual([])
  })
})

describe('stem', () => {
  it.each([
    ['relocation', 'relocat'],
    ['moving', 'mov'],
    ['moved', 'mov'],
    ['companies', 'company'],
    ['led', 'lead'],
    ['began', 'begin'],
    ['built', 'build'],
  ])('%s -> %s', (w, s) => expect(stem(w)).toBe(s))

  it('leaves short words and numbers alone', () => {
    expect(stem('ios')).toBe('ios')
    expect(stem('2018s')).toBe('2018s')
  })

  it('maps word forms to the same stem', () => {
    expect(stem('relocate')).toBe(stem('relocating'))
    expect(stem('hiring')).toBe(stem('hire'))
  })
})

describe('conceptsOf', () => {
  it('maps different wordings to the same concept', () => {
    expect(conceptsOf('Would he move abroad?').has('relocate')).toBe(true)
    expect(conceptsOf('Is relocation possible?').has('relocate')).toBe(true)
  })

  it('finds the age concept for age questions', () => {
    expect(conceptsOf('How old is he?').has('age')).toBe(true)
  })

  it('returns an empty set for text with no concepts', () => {
    expect(conceptsOf('').size).toBe(0)
  })
})

describe('analyse', () => {
  it('returns words, stems and the positions each concept matched', () => {
    const { raw, stems, spans } = analyse('Is relocation possible?')
    expect(raw).toEqual(['is', 'relocation', 'possible'])
    expect(stems).toHaveLength(3)
    expect(spans.get('relocate')).toEqual(new Set([1]))
  })
})

describe('brevity', () => {
  it.each([
    ['Vinod in one sentence', 1],
    ['tl;dr please', 1],
    ['Give me a one-liner', 1],
    ['Summarise in two lines', 2],
    ['Briefly, what does he do?', 2],
    ['In a nutshell?', 2],
    ['Sum him up', 2],
    ['Describe him in three sentences', 3],
  ])('%s -> %i', (q, n) => expect(brevity(q)).toBe(n))

  it.each(['Who is Vinod?', 'Tell me about his projects', ''])('0 when no short answer is asked for: %s', (q) => {
    expect(brevity(q)).toBe(0)
  })
})
