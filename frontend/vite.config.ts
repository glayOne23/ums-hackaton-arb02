import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Harus sebelum react(): membuat routeTree.gen.ts dan memecah kode per rute
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt', // PW-09: tampilkan "Muat ulang" saat versi baru tersedia
      includeAssets: ['favicon.svg'],
      workbox: {
        // Font Inter subset latin ikut disimpan agar tampilan tetap sama tanpa sinyal (pedoman UI §3)
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
        // Ikon PNG 192/512/maskable ditambahkan di public/icons saat logo final tersedia
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
      // Backend Laravel: php artisan serve (port 8000)
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
