import type { RouteLocationRaw } from 'vue-router'

export function landingRoute(roles: string[]): RouteLocationRaw {
  if (roles.includes('Admin')) return { name: 'dashboard' }
  if (roles.includes('Department Head')) return { name: 'dashboard' }
  if (roles.some((r) => ['Event Coordinator', 'Instructor', 'Student Officer'].includes(r)))
    return { name: 'dashboard' }
  return { name: 'student-dashboard' }
}
