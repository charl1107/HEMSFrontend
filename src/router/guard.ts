import type { RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { landingRoute } from './landing-route'

export function installAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const required = to.meta.roles as string[] | undefined
    const isPublic = to.meta.public === true

    if (isPublic) {
      return true
    }

    await auth.ensureRestored()

    if (!auth.isAuthenticated) {
      return { name: 'login' }
    }

    const mustChange = auth.user?.mustChangePassword === true
    if (mustChange && to.name !== 'change-password') {
      return { name: 'change-password' }
    }

    if (!required?.length) {
      return true
    }

    const allowed = required.some((role) => auth.roles.includes(role))
    if (allowed) {
      return true
    }

    return landingRoute(auth.roles) as RouteLocationRaw
  })
}
