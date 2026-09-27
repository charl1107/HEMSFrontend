import { describe, expect, it } from 'vitest'
import { routes } from './routes'

function findChild(path: string) {
  const root = routes.find(
    (route) => route.path === '/' && Array.isArray(route.children),
  )
  if (!root || !Array.isArray(root.children)) {
    throw new Error('App root route with children not found')
  }
  return root.children.find((child) => child.path === path)
}

describe('admin audit route', () => {
  it('exposes admin/audit gated to Admin only', () => {
    const audit = findChild('admin/audit')
    expect(audit?.name).toBe('admin-audit')
    expect(audit?.meta?.roles).toEqual(['Admin'])
  })
})

describe('admin student route', () => {
  it('exposes admin-student-new for Admin only', () => {
    const route = routes
      .flatMap((r) => r.children ?? [r])
      .find((r) => r.name === 'admin-student-new')
    expect(route).toBeTruthy()
    expect(route?.meta?.roles).toEqual(['Admin'])
  })
})
