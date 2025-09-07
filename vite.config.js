// FILE: vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Enables .vue SFC compilation for Vite builds (both local & Netlify)
export default defineConfig({
  plugins: [vue()],
  server: { host: true }, // allow LAN/mobile testing
  build: {
    sourcemap: false,
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['vue', 'vue-qrcode-reader']
  }
})
