import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Hospitality Management Portal',
        short_name: 'HM Portal',
        description:
          'Offline-capable attendance capture for hospitality events.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/welcome',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // Precache the app shell so the SPA opens offline after one online visit.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Network-first for the roster GETs; cache fallback keeps the last
            // roster available offline alongside the IndexedDB snapshot.
            urlPattern: ({ url }: { url: URL }) =>
              /\/events\/[^/]+\/(participants|attendance)$/.test(url.pathname),
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'hems-roster-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Public/event catalog pages: network-first so fresh data wins,
            // cache keeps browsing alive offline.
            urlPattern: ({ url }: { url: URL }) =>
              /^\/(events|api)/.test(url.pathname) ||
              url.pathname.startsWith('/public/'),
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'hems-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
