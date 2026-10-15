import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import { getSummary } from './reports.api'

vi.mock('./http', () => ({
  http: { get: vi.fn() },
}))

describe('reports.api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /reports/summary and returns the payload', async () => {
    const summary = { events: { total: 2 } }
    vi.mocked(http.get).mockResolvedValue({ data: summary })

    await expect(getSummary()).resolves.toEqual(summary)
    expect(http.get).toHaveBeenCalledWith('/reports/summary')
  })
})
