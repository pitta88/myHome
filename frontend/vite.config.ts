import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5002',
        changeOrigin: true
      },
      '/photos': {
        target: 'http://localhost:5002',
        changeOrigin: true
      }
    }
  }
})
