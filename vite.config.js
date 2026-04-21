import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目站：VITE_BASE_PATH=/gunpla-manager/；本地与 Electron 默认 ./
const base = process.env.VITE_BASE_PATH?.trim() || './'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('pdfjs-dist')) return 'pdf'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('xlsx')) return 'excel'
          if (
            id.includes('react-router-dom') ||
            id.includes('\\react\\') ||
            id.includes('/react/') ||
            id.includes('\\react-dom\\') ||
            id.includes('/react-dom/')
          ) {
            return 'react'
          }
          return undefined
        },
      },
    },
  },
})
