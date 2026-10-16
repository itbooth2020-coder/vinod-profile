import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Server-side settings read from .env / the environment (never bundled). See .env.example.
const SERVER_ENV = [
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL',
  'PROFILE_AGENT_MODEL', 'PROFILE_AGENT_VOICE_MODEL', 'PROFILE_AGENT_DAILY_LIMIT', 'PROFILE_AGENT_ORIGINS',
  'PROFILE_AGENT_SECRET', 'TRUST_PROXY',
  'VINCE_VOICE', 'KOKORO_VOICE', 'KOKORO_DTYPE', 'KOKORO_SPEED',
]

// Mounts the runtime profile agent at /api/ask and VINCE's voice at /api/speak for
// `npm run dev` and `npm run preview`. The Anthropic key and voice settings stay server-side:
// they are read from .env / the environment, never bundled.
function profileAgent(env) {
  const mount = async (server) => {
    for (const key of SERVER_ENV) {
      if (env[key] && !process.env[key]) process.env[key] = env[key]
    }
    const { handleAsk } = await import('./server/profileAgent.js')
    server.middlewares.use('/api/ask', handleAsk)
    const { handleSpeak } = await import('./server/voiceAgent.js')
    server.middlewares.use('/api/speak', handleSpeak)
  }
  return { name: 'profile-agent', configureServer: mount, configurePreviewServer: mount }
}

// Content-Security-Policy for the static site (PERF-BE-005), added to dist/index.html as a <meta>
// at build time only: the dev server injects inline scripts of its own. The hashes of index.html's
// inline script and style are computed here, so editing them can't silently break the page.
// frame-ancestors can't be set from a <meta>: CloudFront sends it as a header, together with this
// same policy (keep .claude/agents/aws-deployer.md in sync).
//   script-src: this site only (blog posts are built in by scripts/fetch-blogs.mjs; no JSONP)
//   style-src / font-src: Google Fonts, only for a font picked in Customize (ThemePicker.jsx)
//   img-src: this site only; blog thumbnails are downloaded at build time into public/blog-thumbs/
//   media-src blob:: VINCE's server voice clips (dev / Phase 2)
const CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", 'mailto:'],
}

// sha256 source of an inline element's text. Browsers hash the text after normalizing newlines
// to LF, so a CRLF checkout must be normalized the same way.
const sha256 = (text) => `'sha256-${createHash('sha256').update(text.replace(/\r\n?/g, '\n')).digest('base64')}'`

function contentSecurityPolicy() {
  return {
    name: 'content-security-policy',
    apply: (_, env) => env.command === 'build' && !env.isSsrBuild,
    enforce: 'post',
    // On the final HTML: during transformIndexHtml Vite still holds inline <style> as a placeholder.
    generateBundle(_, bundle) {
      const asset = bundle['index.html']
      if (asset?.type !== 'asset') throw new Error('CSP: dist/index.html not found in the bundle')
      asset.source = withPolicy(String(asset.source))
    },
  }
}

function withPolicy(html) {
  const inline = (tag) =>
    [...html.matchAll(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))]
      .filter(([, attrs = '']) => !/\bsrc=/.test(attrs) && !/type="application\/ld\+json"/.test(attrs))
      .map(([, , body]) => sha256(body))
  const policy = { ...CSP }
  policy['script-src'] = [...CSP['script-src'], ...inline('script')]
  policy['style-src'] = [...CSP['style-src'], ...inline('style')]
  const content = Object.entries(policy).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ')
  // Right after <meta charset>: a meta policy only covers what comes after it in the page.
  const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`
  const charset = /<meta charset="UTF-8" \/>/i
  if (!charset.test(html)) throw new Error('index.html: <meta charset="UTF-8" /> not found for the CSP')
  return html.replace(charset, (m) => `${m}\n    ${meta}`)
}

// Build-time prerender (PERF-FE-007): renders <App /> (src/entry-server.jsx) to HTML and puts it in
// dist/index.html's #root, so the hero paints from the HTML instead of after the JS bundle, and
// src/main.jsx hydrates it. It is also the page for crawlers and visitors without JavaScript.
// Runs before the CSP plugin (listed first); it adds no inline <script> or <style> to hash.
// The server bundle is built into dist-ssr/ (gitignored) and removed afterwards.
function prerender() {
  let config
  return {
    name: 'prerender',
    apply: (_, env) => env.command === 'build' && !env.isSsrBuild,
    enforce: 'post',
    configResolved(resolved) {
      config = resolved
    },
    async generateBundle(_, bundle) {
      const asset = bundle['index.html']
      if (asset?.type !== 'asset') throw new Error('prerender: dist/index.html not found in the bundle')
      const outDir = path.resolve(config.root, 'dist-ssr')
      const { build } = await import('vite')
      try {
        await build({
          configFile: config.configFile,
          mode: config.mode,
          logLevel: 'warn',
          build: { ssr: 'src/entry-server.jsx', outDir, emptyOutDir: true, copyPublicDir: false },
        })
        const { render } = await import(`${pathToFileURL(path.join(outDir, 'entry-server.js')).href}?t=${Date.now()}`)
        const html = render()
        // A prerendered <script>/<style> would need a CSP hash, and style="" attributes are blocked
        // by style-src without 'unsafe-inline' (React sets styles from JS after hydration instead).
        if (/<script|<style|\sstyle="/i.test(html)) throw new Error('prerender: inline script or style in the app HTML')
        const root = '<div id="root"></div>'
        const source = String(asset.source)
        if (!source.includes(root)) throw new Error(`prerender: ${root} not found in index.html`)
        asset.source = source.replace(root, () => `<div id="root">${html}</div>`)
      } finally {
        rmSync(outDir, { recursive: true, force: true })
      }
    },
  }
}

// `vite preview` only: unknown page paths get dist/404.html with status 404, like CloudFront's
// custom error response (PERF-BE-008). Real files (/, assets, /privacy.html) and /api
// are untouched.
function preview404() {
  return {
    name: 'preview-404',
    configurePreviewServer(server) {
      const dist = path.resolve(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next()
        let pathname
        try {
          pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
        } catch {
          return next()
        }
        if (pathname === '/' || pathname.startsWith('/api/')) return next()
        const file = path.join(dist, pathname)
        if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return next()
        const page = path.join(dist, '404.html')
        if (!existsSync(page)) return next()
        res.statusCode = 404
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(req.method === 'HEAD' ? undefined : readFileSync(page))
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), prerender(), contentSecurityPolicy(), preview404(), profileAgent(loadEnv(mode, process.cwd(), ''))],
  // The footer's © year: the prerendered HTML and the hydrating app must render the same one.
  define: { __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()) },
}))
