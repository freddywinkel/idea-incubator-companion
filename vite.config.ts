import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/idea-incubator-companion/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Idea Jar — Incubator Companion',
        short_name: 'Idea Jar',
        description: 'A calm, offline-first companion for capturing ideas and choosing what to do next.',
        theme_color: '#FAF7F2',
        background_color: '#FAF7F2',
        display: 'standalone',
        scope: '/idea-incubator-companion/',
        start_url: '/idea-incubator-companion/',
        orientation: 'portrait',
        icons: [
          {
            src: '/idea-incubator-companion/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/idea-incubator-companion/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/idea-incubator-companion/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/idea-incubator-companion/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
