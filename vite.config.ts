import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages serves the site from /Poker/.
  base: '/Poker/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Poker Trainer — GTO No-Limit Hold’em',
        short_name: 'Poker Trainer',
        description: 'Drill GTO no-limit hold’em: preflop ranges for 6-max and 9-max, and solver-backed flop play grouped by board texture.',
        theme_color: '#0a0f16',
        background_color: '#070b11',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell and every preflop chart are precached. Solved flops
        // (~60 kB each, hundreds of them) are cached as they're first used,
        // so the first visit stays small and drilled flops work offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/flops/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\/flops\/.*\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'flops', expiration: { maxEntries: 600 } },
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
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      output: {
        // Solved flops in their own folder (runtime-cached, see workbox above).
        chunkFileNames: (chunk) => (chunk.facadeModuleId?.includes('/data/postflop/') ? 'assets/flops/[name]-[hash].js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 300_000,
  },
});
