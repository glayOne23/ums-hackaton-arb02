/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before react(): generates routeTree.gen.ts and splits code per route
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // PW-09: show "Muat ulang" (reload) when a new version is available
      includeAssets: ['favicon.svg'],
      workbox: {
        // Cache the Inter latin subset too so screens look the same without a signal (UI guide §3)
        globPatterns: ['**/*.{js,css,html,svg}', '**/inter-latin-wght-normal-*.woff2'],
      },
      manifest: {
        name: 'SIGAP — CV Arba\'in',
        short_name: 'SIGAP',
        description: 'Kunjungan sales, stok, dan tagihan CV Arba\'in Jaya Mandiri',
        lang: 'id',
        start_url: '/',
        display: 'standalone',
        theme_color: '#15803d',
        background_color: '#fafaf9',
        // PNG icons 192/512/maskable go into public/icons once the final logo is ready
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // Laravel backend: php artisan serve (port 8000)
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    // tests/e2e belongs to Playwright (npm run test:e2e), not Vitest
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
