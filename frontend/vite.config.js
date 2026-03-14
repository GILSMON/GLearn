import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // VITE_BASE_PATH is set to /GLearn/ in GitHub Actions for Pages deployment
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 5176,
    host: '0.0.0.0',  // expose on network by default
  },
})
