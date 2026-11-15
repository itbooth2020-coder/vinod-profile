import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Unit and component tests (npm test). Kept apart from vite.config.js on purpose: that config's
// plugins mount /api/ask and /api/speak on any dev server (which Vitest starts) and prerender the
// app during builds, and neither must run during tests. Only the React plugin and the one define
// the app needs (Footer.jsx's __BUILD_YEAR__) are repeated here.
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_YEAR__: JSON.stringify(new Date().getFullYear()) },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
    restoreMocks: true,
    // TEST-007: on Windows, a workspace opened as c:\… (lowercase drive) made the default pool load
    // Vitest twice, once per drive spelling, so every file failed with "Vitest failed to find the
    // runner". vmThreads runs each file in a VM context and passes with either spelling.
    pool: 'vmThreads',
  },
})
