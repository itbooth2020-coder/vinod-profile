import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Mounts the runtime profile agent at /api/ask for `npm run dev` and `npm run preview`.
// The Anthropic key stays server-side: it is read from .env / the environment, never bundled.
function profileAgent(env) {
  const mount = async (server) => {
    for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) {
      if (env[key] && !process.env[key]) process.env[key] = env[key]
    }
    const { handleAsk } = await import('./server/profileAgent.js')
    server.middlewares.use('/api/ask', handleAsk)
  }
  return { name: 'profile-agent', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), profileAgent(loadEnv(mode, process.cwd(), ''))],
}))
