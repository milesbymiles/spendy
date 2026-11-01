import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative URLs so the same build works at a sub-path (GitHub Pages /spendy/) and in the iOS app.
  base: './',
  // Shown in Settings so it's easy to tell which build a phone is running.
  define: { __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '.')) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: './',
        name: 'spendy',
        short_name: 'spendy',
        description: 'A tiny, private expense tracker that lives on your phone.',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f4f1',
        theme_color: '#f4f4f1',
        categories: ['finance', 'productivity'],
        shortcuts: [{ name: 'Add expense', short_name: 'Add', url: './?add', icons: [{ src: 'pwa-192.png', sizes: '192x192' }] }],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  // Expose the dev server on your LAN so you can open it from your phone.
  server: { host: true },
  preview: { host: true },
})
