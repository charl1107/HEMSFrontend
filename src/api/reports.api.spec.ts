import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import {
  downloadAttendanceCsv,
  downloadEventPdf,
  downloadParticipantsCsv,
  getEventReport,
  getSummary,
} from './reports.api'

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

  it('GETs /reports/events/:eventId/summary and returns the payload', async () => {
    const report = { event: { id: 'e1', title: 'Fair' } }
    vi.mocked(http.get).mockResolvedValue({ data: report })

    await expect(getEventReport('e1')).resolves.toEqual(report)
    expect(http.get).toHaveBeenCalledWith('/reports/events/e1/summary')
  })

  it('downloads attendance CSV as a blob', async () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' })
    vi.mocked(http.get).mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          'attachment; filename="spring-fair-attendance.csv"; filename*=UTF-8\'\'spring-fair-attendance.csv',
      },
    })

    const result = await downloadAttendanceCsv('e1')
    expect(http.get).toHaveBeenCalledWith(
      '/reports/events/e1/attendance.csv',
      { responseType: 'blob' },
    )
    expect(result.blob).toBe(blob)
    expect(result.filename).toBe('spring-fair-attendance.csv')
  })

  it('downloads participants CSV as a blob with fallback filename', async () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' })
    vi.mocked(http.get).mockResolvedValue({ data: blob, headers: {} })

    const result = await downloadParticipantsCsv('e1')
    expect(http.get).toHaveBeenCalledWith(
      '/reports/events/e1/participants.csv',
      { responseType: 'blob' },
    )
    expect(result.blob).toBe(blob)
    expect(result.filename).toBe('participants.csv')
  })

  it('downloads the event PDF as a blob', async () => {
    const blob = new Blob(['%PDF-'], { type: 'application/pdf' })
    vi.mocked(http.get).mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition':
          'attachment; filename="spring-fair-report.pdf"',
      },
    })

    const result = await downloadEventPdf('e1')
    expect(http.get).toHaveBeenCalledWith(
      '/reports/events/e1/report.pdf',
      { responseType: 'blob' },
    )
    expect(result.filename).toBe('spring-fair-report.pdf')
  })
})
