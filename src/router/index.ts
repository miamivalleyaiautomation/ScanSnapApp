import { createRouter, createWebHistory } from 'vue-router'
import VerifyTab from '@/components/VerifyTab.vue' // path matches the error log
import Setup from '@/views/setup.vue'

const routes = [
  { path: '/', name: 'verify', component: VerifyTab },
  { path: '/setup', name: 'setup', component: Setup },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
