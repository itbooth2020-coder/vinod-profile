import { describe, expect, it } from 'vitest'
import * as data from './data.js'

// Owner decisions that every part of the site relies on (data.js is the single source).
const allKeys = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => allKeys(v, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push(k)
      allKeys(v, out)
    }
  }
  return out
}
const exported = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === 'object'))
const text = JSON.stringify(exported)

describe('data.js invariants', () => {
  it('stores no age or date of birth anywhere', () => {
    const keys = allKeys(exported)
    expect(keys.filter((k) => /birth|dob|^age$|^born/i.test(k))).toEqual([])
    expect(data.profileCard.map(([k]) => k)).not.toContain('age')
    expect(text).not.toMatch(/\b(19[5-9]\d)\b.*born|born in|\d+ years old|date of birth/i)
  })

  it('keeps availability hidden', () => {
    expect(data.availability.public).toBe(false)
    expect(data.showAvailability).toBe(false)
    expect(data.profileCard.map(([k]) => k)).not.toEqual(expect.arrayContaining(['availability', 'notice']))
  })

  it('publishes no resume download', () => {
    const keys = allKeys(exported)
    expect(keys.filter((k) => /resume|cv|pdf|download/i.test(k))).toEqual([])
    expect(text).not.toMatch(/\.pdf\b/i)
  })

  it('has no phone number', () => {
    expect(allKeys(exported).filter((k) => /phone|mobile.?number|tel/i.test(k))).toEqual([])
    expect(text).not.toMatch(/\+91|\btel:/)
  })

  it('has the fields the components need', () => {
    for (const p of data.projects) {
      expect(p.media).toMatch(/^project\/[\w-]+$/)
      expect(p.name).toMatch(/ – /)
    }
    for (const e of data.experience) expect(e.period).toMatch(/^[A-Z][a-z]{2} \d{4} – ([A-Z][a-z]{2} \d{4}|Present)$/)
    expect(data.experience.filter((e) => e.current)).toHaveLength(1)
    expect(data.skills.filter((s) => s.earlier)).toHaveLength(1)
    expect(new Set(data.stats.map((s) => s.label)).size).toBe(data.stats.length)
  })

  it('links only to https profiles', () => {
    for (const k of ['linkedin', 'github', 'facebook', 'x']) expect(data.profile[k]).toMatch(/^https:\/\//)
    for (const b of Object.values(data.blogs)) expect(b.url).toMatch(/^https:\/\//)
  })
})
