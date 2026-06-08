import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-charts':   ['recharts'],
          'vendor-pdf':      ['jspdf', 'jspdf-autotable'],
          'vendor-xlsx':     ['xlsx'],
          'vendor-misc':     ['@tanstack/react-query', 'react-hook-form', 'react-hot-toast', 'date-fns', 'lucide-react', 'clsx'],
        },
      },
    },
  },
})
