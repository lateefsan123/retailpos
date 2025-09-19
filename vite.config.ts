import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/retailpos/',  // Changed from '/possystem/' to '/retailpos/'
  server: {
    port: 3000,
  },
})