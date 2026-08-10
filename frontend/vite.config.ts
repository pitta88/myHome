/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // dev 서버와 같은 origin을 써서 MSW의 상대경로 핸들러가 그대로 맞는다
    environmentOptions: {
      jsdom: { url: 'http://localhost:5174/' }
    },
    // 테스트에서 Tailwind를 실제로 처리할 필요가 없다 (클래스명은 문자열로 그대로 남는다)
    css: false,
  },
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
