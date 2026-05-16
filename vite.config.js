import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Railway + local hosts allowed for dev/preview only (production uses static `serve`). */
const allowedHosts = [
  'hrmszocco-production.up.railway.app',
  '.up.railway.app',
  '.railway.app',
  'localhost',
]

const listenOptions = {
  host: true,
  allowedHosts,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: listenOptions,
  preview: {
    ...listenOptions,
    port: Number(process.env.PORT) || 4173,
    strictPort: Boolean(process.env.PORT),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
