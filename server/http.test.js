// @vitest-environment node
import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { allowedOrigin, clientIp, isJson, json, readJson, stripPort, TooLarge } from './http.js'

const req = (headers = {}, remoteAddress = '10.0.0.9') => ({ headers, socket: { remoteAddress } })

describe('stripPort', () => {
  it.each([
    ['203.0.113.7:443', '203.0.113.7'],
    ['2001:db8::1:443', '2001:db8::1'],
    ['[2001:db8::1]:443', '2001:db8::1'],
    [' 203.0.113.7:1 ', '203.0.113.7'],
    ['203.0.113.7', '203.0.113.7'],
  ])('%s -> %s', (v, ip) => expect(stripPort(v)).toBe(ip))
})

describe('clientIp', () => {
  it("uses CloudFront's viewer address without its port", () => {
    expect(clientIp(req({ 'cloudfront-viewer-address': '198.51.100.4:51234' }), {})).toBe('198.51.100.4')
    expect(clientIp(req({ 'cloudfront-viewer-address': '2001:db8::7:51234' }), {})).toBe('2001:db8::7')
  })

  it('prefers the viewer address over X-Forwarded-For, even with TRUST_PROXY', () => {
    const r = req({ 'cloudfront-viewer-address': '198.51.100.4:1', 'x-forwarded-for': '1.1.1.1' })
    expect(clientIp(r, { TRUST_PROXY: '1' })).toBe('198.51.100.4')
  })

  it('ignores a blank viewer address', () => {
    expect(clientIp(req({ 'cloudfront-viewer-address': '  ' }), {})).toBe('10.0.0.9')
  })

  it('ignores X-Forwarded-For unless TRUST_PROXY is set (it can be spoofed)', () => {
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }), {})).toBe('10.0.0.9')
  })

  it.each(['1', 'true', 'YES'])('uses the first X-Forwarded-For hop with TRUST_PROXY=%s', (v) => {
    expect(clientIp(req({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }), { TRUST_PROXY: v })).toBe('1.2.3.4')
  })

  it('falls back to the socket, then "unknown"', () => {
    expect(clientIp(req({}, '127.0.0.1'), { TRUST_PROXY: '1' })).toBe('127.0.0.1')
    expect(clientIp({ headers: {} }, {})).toBe('unknown')
  })
})

describe('allowedOrigin', () => {
  it.each(['https://www.vinodyadav.com', 'https://vinodyadav.com', 'http://localhost:5173', 'http://127.0.0.1:4173', 'http://[::1]:5173'])('allows %s by default', (origin) => {
    expect(allowedOrigin(req({ origin }), {})).toBe(true)
  })

  it.each(['https://evil.example', 'http://vinodyadav.com', 'https://vinodyadav.com.evil.example', 'http://localhost', 'null'])('rejects %s', (origin) => {
    expect(allowedOrigin(req({ origin }), {})).toBe(false)
  })

  it('uses the Referer when Origin is missing', () => {
    expect(allowedOrigin(req({ referer: 'https://vinodyadav.com/?brief=1' }), {})).toBe(true)
    expect(allowedOrigin(req({ referer: 'https://evil.example/page' }), {})).toBe(false)
  })

  it('rejects requests with neither, or a malformed Referer', () => {
    expect(allowedOrigin(req({}), {})).toBe(false)
    expect(allowedOrigin(req({ referer: 'not a url' }), {})).toBe(false)
  })

  it('PROFILE_AGENT_ORIGINS replaces the defaults (trailing slashes and spaces ignored)', () => {
    const env = { PROFILE_AGENT_ORIGINS: ' https://staging.example/ , https://other.example' }
    expect(allowedOrigin(req({ origin: 'https://staging.example' }), env)).toBe(true)
    expect(allowedOrigin(req({ origin: 'https://other.example' }), env)).toBe(true)
    expect(allowedOrigin(req({ origin: 'https://vinodyadav.com' }), env)).toBe(false)
    expect(allowedOrigin(req({ origin: 'http://localhost:5173' }), env)).toBe(false)
  })

  it('SEC-012: in production, localhost is not allowed by default (the site origins still are)', () => {
    const env = { NODE_ENV: 'production' }
    expect(allowedOrigin(req({ origin: 'http://localhost:5173' }), env)).toBe(false)
    expect(allowedOrigin(req({ origin: 'http://127.0.0.1:4173' }), env)).toBe(false)
    expect(allowedOrigin(req({ origin: 'https://www.vinodyadav.com' }), env)).toBe(true)
  })
})

describe('isJson', () => {
  it.each([
    ['application/json', true],
    ['application/json; charset=utf-8', true],
    ['Application/JSON', true],
    ['application/jsonp', false],
    ['text/plain', false],
    ['application/x-www-form-urlencoded', false],
    [undefined, false],
  ])('%s -> %s', (type, ok) => expect(isJson(req(type ? { 'content-type': type } : {}))).toBe(ok))
})

describe('readJson', () => {
  const body = (s) => Object.assign(Readable.from([Buffer.from(s)]), { headers: {} })

  it('parses the body, and treats an empty one as {}', async () => {
    await expect(readJson(body('{"q":"hi"}'), 100)).resolves.toEqual({ q: 'hi' })
    await expect(readJson(Object.assign(Readable.from([]), { headers: {} }), 100)).resolves.toEqual({})
  })

  it('throws TooLarge past the limit', async () => {
    await expect(readJson(body('x'.repeat(101)), 100)).rejects.toBeInstanceOf(TooLarge)
  })

  it('throws a SyntaxError on invalid JSON', async () => {
    await expect(readJson(body('{nope'), 100)).rejects.toBeInstanceOf(SyntaxError)
  })

  it('uses an already-parsed body', async () => {
    await expect(readJson({ body: { a: 1 } }, 10)).resolves.toEqual({ a: 1 })
  })
})

describe('json', () => {
  it('sends JSON that must not be cached', () => {
    const res = { writeHead: (status, headers) => Object.assign(res, { status, headers }), end: (b) => (res.body = b) }
    json(res, 413, { error: 'Too large' }, { 'Retry-After': '1' })
    expect(res.status).toBe(413)
    expect(res.headers).toEqual({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '1' })
    expect(JSON.parse(res.body)).toEqual({ error: 'Too large' })
  })
})
