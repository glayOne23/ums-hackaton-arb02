import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * Demo Day rehearsal (SRS §7) on the DEMO database, not the sample data:
 *   php artisan migrate:fresh --seed --seeder=DemoSeeder
 *   npm run test:demo
 *
 * Runs on the BUILT app with its service worker (vite preview, port 4173), as an
 * installed phone would: the dev server has no service worker, so a screen not
 * opened before the signal goes cannot load offline there. /api still goes to
 * the backend on :8000 (preview uses server.proxy). Devices are set in the spec.
 */
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: 'demo-scenario.spec.ts',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'demo' }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
