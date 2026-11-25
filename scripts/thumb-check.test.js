// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { imageType, isAllowedThumbUrl, MAX_THUMB_BYTES, readCapped } from './thumb-check.mjs'

// SEC-013: blog thumbnails downloaded at build time (scripts/fetch-blogs.mjs).
describe('blog thumbnail checks', () => {
  it.each([
    'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvX/w480-h270-c/x.png',
    'https://1.bp.blogspot.com/-abc/XYZ/s72-c/x.jpg',
  ])('allows Blogger image hosts: %s', (url) => expect(isAllowedThumbUrl(url)).toBe(true))

  it.each([
    'http://blogger.googleusercontent.com/img/x.png',
    'https://blogger.googleusercontent.com.evil.example/x.png',
    'https://evil.example/x.png',
    'https://169.254.169.254/latest/meta-data/',
    'https://localhost/x.png',
    'https://user:pw@blogger.googleusercontent.com/x.png',
    'https://blogger.googleusercontent.com:8443/x.png',
    'file:///etc/passwd',
    'not a url',
    undefined,
  ])('refuses %s', (url) => expect(isAllowedThumbUrl(url)).toBe(false))

  it('recognises image bytes and refuses anything else', () => {
    expect(imageType([0xff, 0xd8, 0xff, 0xe0])).toBe('jpg')
    expect(imageType([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).toBe('png')
    expect(imageType([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])).toBe('webp')
    expect(imageType(Buffer.from('GIF89a'))).toBe('gif')
    expect(imageType(Buffer.from('<script>alert(1)</script>'))).toBeNull()
    expect(imageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
  })

  it('stops reading a body over the size cap', async () => {
    const big = new Response(new Uint8Array(MAX_THUMB_BYTES + 1))
    await expect(readCapped(big)).rejects.toThrow(/too large/)
    const ok = await readCapped(new Response(new Uint8Array([0xff, 0xd8, 0xff])))
    expect(ok.length).toBe(3)
  })

  it('the thumbnails already in public/blog-thumbs are real images of their extension', () => {
    const dir = path.resolve(process.cwd(), 'public/blog-thumbs')
    for (const f of readdirSync(dir)) expect(imageType(readFileSync(path.join(dir, f))), f).toBe(path.extname(f).slice(1))
  })
})
