import { describe, expect, it } from 'vitest'
import { routes } from './routes'
import { REPORT_ROLES } from '../api/reports.api'

function findChild(path: string) {
  const root = routes.find(
    (route) => route.path === '/' && Array.isArray(route.children),
  )
  if (!root || !Array.isArray(root.children)) {
    throw new Error('App root route with children not found')
  }
  return root.children.find((child) => child.path === path)
}

describe('reports routes', () => {
  it('exposes the reports dashboard with Admin/Dept Head roles', () => {
    const dashboard = findChild('reports')

    expect(dashboard?.name).toBe('reports-dashboard')
    expect(dashboard?.meta?.roles).toEqual([...REPORT_ROLES])
    expect([...REPORT_ROLES].sort()).toEqual(['Admin', 'Department Head'])
  })
})
