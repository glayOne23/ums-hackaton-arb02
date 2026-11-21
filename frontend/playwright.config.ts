import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests. Needs the backend running (php artisan serve) with sample data:
 *   php artisan migrate:fresh --seed
 * The frontend is started automatically when it is not running yet.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Each sample account signs in once per run (tests/e2e/support/global-setup.ts)
  globalSetup: './tests/e2e/support/global-setup.ts',
  outputDir: './test-results',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'id-ID',
    trace: 'retain-on-failure',
  },
  // Test widths per UI guide §12: phone 360 px and desktop 1280 px
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
