import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [vue(), VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    includeAssets: ['prumo-icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: 'Prumo — Finanças da casa',
      short_name: 'Prumo',
      description: 'Suas contas e planos em família, no prumo.',
      lang: 'pt-BR',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#F2F6F4',
      theme_color: '#0F5B4F',
      categories: ['finance', 'productivity'],
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/health(?:\/|$)/],
      // Only the static app shell is cached. Financial responses never enter Cache Storage.
      runtimeCaching: [],
    },
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5174,
    host: '0.0.0.0'
  }
})
