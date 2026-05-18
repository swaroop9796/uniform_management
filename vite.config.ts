import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Restaurant Management',
        short_name: 'RestaurantMgmt',
        description: 'Restaurant Management SaaS',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': { target: 'http://127.0.0.1:54321', changeOrigin: true },
      '/rest': { target: 'http://127.0.0.1:54321', changeOrigin: true },
      '/storage': { target: 'http://127.0.0.1:54321', changeOrigin: true },
      '/realtime': { target: 'http://127.0.0.1:54321', changeOrigin: true, ws: true },
      '/functions': { target: 'http://127.0.0.1:54321', changeOrigin: true },
    },
  },
})
