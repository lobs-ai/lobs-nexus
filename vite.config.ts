import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxy = {
  '/api': {
    target: 'http://127.0.0.1:18789',
    changeOrigin: true,
  },
  '/paw/api': {
    target: 'http://127.0.0.1:18789',
    changeOrigin: true,
  },
  '/memory-api': {
    target: 'http://127.0.0.1:7420',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    assetsDir: 'static',
  },
  preview: {
    allowedHosts: true,
    proxy,
  },
  server: {
    allowedHosts: true,
    proxy,
  }
})
