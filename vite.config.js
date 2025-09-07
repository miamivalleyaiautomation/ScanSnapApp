// FILE: vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Required so Vite can parse .vue files (SFCs)
export default defineConfig({
  plugins: [vue()],
  // optional but handy when testing on device/LAN
  server: { host: true }
})
