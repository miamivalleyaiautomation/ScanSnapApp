// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

// Adjust these imports to match your file locations
import VerifyTab from '@/views/VerifyTab.vue'
import Setup from '@/views/setup.vue' // <-- you said the file is setup.vue

const routes = [
  { path: '/', name: 'verify', component: VerifyTab },
  { path: '/setup', name: 'setup', component: Setup },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() { return { top: 0 } },
})

export default router
