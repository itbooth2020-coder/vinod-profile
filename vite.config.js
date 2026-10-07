import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Mounts the runtime profile agent at /api/ask and VINCE's voice at /api/speak for
// `npm run dev` and `npm run preview`. The Anthropic key and voice settings stay server-side:
// they are read from .env / the environment, never bundled.
function profileAgent(env) {
  const mount = async (server) => {
    for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'VINCE_VOICE', 'KOKORO_VOICE', 'KOKORO_DTYPE', 'KOKORO_SPEED']) {
      if (env[key] && !process.env[key]) process.env[key] = env[key]
    }
    const { handleAsk } = await import('./server/profileAgent.js')
    server.middlewares.use('/api/ask', handleAsk)
    const { handleSpeak } = await import('./server/voiceAgent.js')
    server.middlewares.use('/api/speak', handleSpeak)
  }
  return { name: 'profile-agent', configureServer: mount, configurePreviewServer: mount }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), profileAgent(loadEnv(mode, process.cwd(), ''))],
}))
