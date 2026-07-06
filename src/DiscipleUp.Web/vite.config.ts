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
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
      },
      '/hangfire': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
      },
      '/hubs': {
        target: 'https://localhost:7001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    // Production build goes into the API's wwwroot so it's served from the same host
    outDir: '../DiscipleUp.Api/wwwroot',
    emptyOutDir: true,
  },
})
