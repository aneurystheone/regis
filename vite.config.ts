/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    css: {
      devSourcemap: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.avif', 'logo.png', 'maskable-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Regis - Gestión Docente Inteligente',
          short_name: 'Regis',
          description: 'Plataforma integral de gestión docente y planificación educativa',
          theme_color: '#1F3A5F',
          background_color: '#0F172A',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
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
              src: 'maskable-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,avif,woff,woff2,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets'
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Firebase granular splitting
              if (id.includes('firebase/auth') || id.includes('@firebase/auth')) {
                return 'firebase-auth';
              }
              if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
                return 'firebase-firestore';
              }
              if (id.includes('firebase/storage') || id.includes('@firebase/storage')) {
                return 'firebase-storage';
              }
              if (id.includes('firebase/analytics') || id.includes('@firebase/analytics') ||
                  id.includes('firebase/remote-config') || id.includes('@firebase/remote-config')) {
                return 'firebase-extras';
              }
              if (id.includes('firebase') || id.includes('@firebase')) {
                return 'firebase-core';
              }
              // Vendor splitting for heavy libs
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'motion';
              }
              if (id.includes('@fluentui')) {
                return 'fluentui-icons';
              }
              if (id.includes('lucide-react')) {
                return 'lucide';
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: mode !== 'production' ? true : 'hidden',
    },
    define: {
      // NOTE: Gemini API key intentionally removed from client bundle (security).
      // The key lives in Firebase Functions environment only (server-side).
      '__BUILD_DATE__': JSON.stringify(new Date().toISOString()),
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '0.0.0')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
