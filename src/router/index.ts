import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { installAuthGuard } from './guard'

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

installAuthGuard(router)
