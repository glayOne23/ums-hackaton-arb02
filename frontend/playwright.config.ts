import { defineConfig, devices } from '@playwright/test'

/**
 * Tes end-to-end. Butuh backend berjalan (php artisan serve) dengan data contoh:
 *   php artisan migrate:fresh --seed
 * Frontend dijalankan otomatis bila belum berjalan.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'id-ID',
    trace: 'retain-on-failure',
  },
  // Lebar uji sesuai Pedoman UI §12: HP 360 px dan desktop 1280 px
  projects: [
    { name: 'hp', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
})
