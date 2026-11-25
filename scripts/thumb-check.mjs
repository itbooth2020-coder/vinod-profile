// SEC-013: what scripts/fetch-blogs.mjs accepts as a blog thumbnail. The feed's thumbnail URL is data
// from Blogger, so a taken-over blog could point the build at an internal address or a huge file and
// have arbitrary bytes published under an image name. Only Blogger's image hosts over HTTPS, no
// redirects, at most MAX_THUMB_BYTES, and only real JPEG / PNG / WebP / GIF bytes are kept.

export const MAX_THUMB_BYTES = 2 * 1024 * 1024

/** true for https://blogger.googleusercontent.com/… and https://<n>.bp.blogspot.com/… only. */
export function isAllowedThumbUrl(url) {
  let u
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false
  return u.hostname === 'blogger.googleusercontent.com' || /^[a-z0-9-]+\.bp\.blogspot\.com$/.test(u.hostname)
}

/** The image type from the file's first bytes ('jpg' | 'png' | 'webp' | 'gif'), or null. */
export function imageType(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const at = (i, ...xs) => xs.every((x, j) => b[i + j] === x)
  if (at(0, 0xff, 0xd8, 0xff)) return 'jpg'
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png'
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'webp'
  if (at(0, 0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'gif'
  return null
}

/** Reads a fetch Response body, failing as soon as it exceeds `max` bytes. */
export async function readCapped(res, max = MAX_THUMB_BYTES) {
  const declared = Number(res.headers.get('content-length'))
  if (declared > max) throw new Error(`thumbnail too large (${declared} bytes)`)
  const chunks = []
  let size = 0
  for await (const chunk of res.body) {
    size += chunk.length
    if (size > max) throw new Error(`thumbnail too large (over ${max} bytes)`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
