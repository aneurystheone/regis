import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'], // Modified includeAssets
        manifest: {
          name: 'Regis - Gestión Docente', // Modified name
          short_name: 'Regis',
          description: 'Herramienta de productividad para docentes dominicanos', // Modified description
          theme_color: '#1F3A5F',
          background_color: '#ffffff', // Modified background_color
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png', // Modified src for third icon
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable' // Modified purpose for third icon
            }
          ]
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: ({ url }) => {
                return url.hostname.includes('firebasestorage.googleapis.com');
              },
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-storage-images',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 Year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      })
    ],
    build: { // Added build configuration
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('jspdf')) return 'jspdf';
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('lucide') || id.includes('icons')) return 'icons';
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
