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
    // Bind to all IPv4 interfaces so phones/other devices on the LAN can reach
    // the dev server (open http://<laptop-LAN-IP>:5173). /api & /hubs are proxied
    // to the API on this machine, so only the dev server needs LAN exposure.
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5123',
        changeOrigin: true,
      },
      '/hangfire': {
        target: 'http://localhost:5123',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5123',
        changeOrigin: true,
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
