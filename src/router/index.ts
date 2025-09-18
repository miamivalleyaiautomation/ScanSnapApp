import { createRouter, createWebHistory } from 'vue-router'
import VerifyTab from '@/views/VerifyTab.vue'
import Setup from '@/views/setup.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'verify', component: VerifyTab },
    { path: '/setup', name: 'setup', component: Setup },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
