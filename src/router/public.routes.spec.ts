import { describe, expect, it } from 'vitest'
import { publicRoutes } from './public.routes'

function collectMetaPublic(
  records: typeof publicRoutes,
): { name: string | undefined; isPublic: boolean }[] {
  const out: { name: string | undefined; isPublic: boolean }[] = []
  for (const route of records) {
    if (route.children) {
      for (const child of route.children) {
        out.push({
          name: child.name as string | undefined,
          isPublic: child.meta?.public === true,
        })
      }
    } else {
      out.push({
        name: route.name as string | undefined,
        isPublic: route.meta?.public === true,
      })
    }
  }
  return out
}

describe('public event routes', () => {
  it('marks list and detail as public for anonymous access', () => {
    const entries = collectMetaPublic(publicRoutes)
    expect(entries).toEqual([
      { name: 'public-events', isPublic: true },
      { name: 'public-event-detail', isPublic: true },
    ])
  })
})
