import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mercon/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      'leaflet-geosearch/assets/css/leaflet.css': path.resolve(__dirname, '../../node_modules/leaflet/dist/leaflet.css'),
    },
  },
  server: {
    port: 5174,
    // Proxy /api -> dev.mercon.tech server by default, or VITE_API_URL if specified
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://dev.mercon.tech',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://dev.mercon.tech',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'https://dev.mercon.tech',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  // Pre-bundle all heavy deps up front so Vite's optimizer doesn't cause
  // repeated full-page reloads during the first cold start session.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@tanstack/react-query',
      'axios',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'sonner',
      'date-fns',
      'date-fns-tz',
      'framer-motion',
      'recharts',
      'leaflet',
      'react-leaflet',
      'exceljs',
      'jspdf',
      'jspdf-autotable',
      'cmdk',
      'react-day-picker',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@base-ui/react/tooltip',
    ],
  },
})

