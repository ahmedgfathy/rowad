  import { fileURLToPath, URL } from 'node:url'
  import { defineConfig } from 'vite'
  import tailwindcss from '@tailwindcss/vite'
  import vue from '@vitejs/plugin-vue'
  import { VitePWA } from 'vite-plugin-pwa'

  export default defineConfig({
    plugins: [
      tailwindcss(),
      vue(),

      VitePWA({
        registerType: 'autoUpdate',

        injectRegister: 'auto',

        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'masked-icon.svg'
        ],

        manifest: {
          name: 'Rowad CRM',
          short_name: 'Rowad',
          description: 'Real Estate CRM Platform',

          theme_color: '#020617',
          background_color: '#020617',

          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',

          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/maskable-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable any'
            }
          ]
        },

        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                request.destination === 'document',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache'
              }
            },
            {
              urlPattern: ({ request }) =>
                request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache'
              }
            },
            {
              urlPattern: ({ request }) =>
                request.destination === 'script' ||
                request.destination === 'style',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache'
              }
            }
          ]
        }
      })
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(
          new URL('./src', import.meta.url)
        )
      }
    }
  })