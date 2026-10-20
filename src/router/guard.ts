import type { RouteLocationRaw, Router } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { landingRoute } from './landing-route'

/**
 * The entry pages whose only job is to start or resume a session. Anyone who
 * already has one should be dropped straight into the app instead of being
 * shown a welcome screen or a sign-in form again — which is what happened when
 * the app was reopened: `/` and `/welcome` have no session check of their own,
 * so a returning user kept landing on "Sign in" on mobile and in narrow windows.
 */
const AUTH_ENTRY_ROUTES = new Set(['home', 'welcome', 'login', 'sign-in'])

export function installAuthGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // One-shot access-denial feedback (U9 follow-up): the flag must survive
    // the denial's own redirect onto the landing that renders it, so this
    // exempts that landing target. Any other navigation consumes the flag —
    // a stale notice can never re-show on a later visit to the landing.
    if (auth.deniedPath) {
      const landing = landingRoute(auth.roles) as { name?: string }
      if (to.name !== landing.name) {
        auth.clearDenied()
      }
    }

    const required = to.meta.roles as string[] | undefined
    const isPublic = to.meta.public === true

    if (isPublic) {
      if (AUTH_ENTRY_ROUTES.has(String(to.name))) {
        await auth.ensureRestored()
        if (auth.isAuthenticated) {
          // Mirrors auth.store login(): a password reset always comes first.
          if (auth.user?.mustChangePassword === true) {
            return { name: 'change-password' }
          }
          return landingRoute(auth.roles)
        }
      }
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

    // Role denial (U9): record the refused path so the landing view can
    // explain the redirect instead of dropping the user there silently.
    auth.deniedPath = to.fullPath

    return landingRoute(auth.roles) as RouteLocationRaw
  })
}
