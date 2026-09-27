// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventReportView from './EventReportView.vue'
import { saveBlob } from '../../../api/documents.api'
import {
  downloadAttendanceCsv,
  downloadEventPdf,
  downloadParticipantsCsv,
  getEventReport,
  type EventReport,
  type ReportDownload,
} from '../../../api/reports.api'

vi.mock('../../../api/reports.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/reports.api')>()
  return {
    ...actual,
    getEventReport: vi.fn(),
    downloadAttendanceCsv: vi.fn(),
    downloadParticipantsCsv: vi.fn(),
    downloadEventPdf: vi.fn(),
  }
})

vi.mock('../../../api/documents.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/documents.api')>()
  return {
    ...actual,
    saveBlob: vi.fn(),
  }
})

function makeReport(overrides: Partial<EventReport> = {}): EventReport {
  return {
    event: {
      id: 'e1',
      title: 'Spring Fair',
      status: 'Completed',
      eventDate: '2026-05-01T00:00:00.000Z',
      venue: 'Main Hall',
      eventType: 'Workshop',
      description: null,
    },
    participantTypes: [{ type: 'Student', count: 10 }],
    stats: {
      registered: 10,
      present: 7,
      absent: 2,
      missing: 1,
      absentees: 3,
      presentRate: 0.7,
      absentRate: 0.3,
    },
    participants: [],
    absentees: [
      {
        participantId: 'p1',
        name: 'Ada Lovelace',
        participantType: 'Student',
        email: 'ada@x.com',
        attendanceStatus: 'Absent',
        timeIn: null,
        timeOut: null,
        isAbsentee: true,
        absenteeReason: 'Marked Absent',
      },
      {
        participantId: 'p2',
        name: 'Grace Hopper',
        participantType: 'Student',
        email: null,
        attendanceStatus: null,
        timeIn: null,
        timeOut: null,
        isAbsentee: true,
        absenteeReason: 'No attendance record (event ended)',
      },
    ],
    tasks: { total: 4, done: 3, completionRate: 0.75 },
    absenteeDefinition: 'Absent or no row when Completed.',
    ...overrides,
  }
}

async function mountReport(): Promise<VueWrapper> {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'reports-dashboard', component: { template: '<div />' } },
      { path: '/reports/events/:id', name: 'event-report', component: EventReportView },
    ],
  })
  await router.push({ name: 'event-report', params: { id: 'e1' } })
  await router.isReady()
  const wrapper = mount(EventReportView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

function download(filename: string): ReportDownload {
  return { blob: new Blob(['x']), filename }
}

describe('EventReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getEventReport).mockResolvedValue(makeReport())
  })

  it('renders event stats and the absentee list', async () => {
    const wrapper = await mountReport()

    expect(wrapper.find('[data-testid="event-title"]').text()).toBe('Spring Fair')
    expect(wrapper.find('[data-testid="stat-registered"]').text()).toBe('10')
    expect(wrapper.find('[data-testid="stat-absentees"]').text()).toBe('3')
    expect(wrapper.find('[data-testid="absentee-p1"]').text()).toContain(
      'Ada Lovelace',
    )
    expect(wrapper.find('[data-testid="absentee-p1"]').text()).toContain(
      'Marked Absent',
    )
    expect(wrapper.find('[data-testid="absentee-p2"]').text()).toContain(
      'No attendance record',
    )
    expect(wrapper.find('[data-testid="event-report-error"]').exists()).toBe(false)
  })

  it('shows the empty state when there are no absentees', async () => {
    vi.mocked(getEventReport).mockResolvedValue(
      makeReport({ absentees: [], stats: { ...makeReport().stats, absentees: 0 } }),
    )

    const wrapper = await mountReport()

    expect(wrapper.find('[data-testid="absentees-empty"]').exists()).toBe(true)
  })

  it('exports the attendance CSV through the blob download', async () => {
    const result = download('spring-fair-attendance.csv')
    vi.mocked(downloadAttendanceCsv).mockResolvedValue(result)

    const wrapper = await mountReport()
    await wrapper.find('[data-testid="export-attendance-csv"]').trigger('click')
    await flushPromises()

    expect(downloadAttendanceCsv).toHaveBeenCalledWith('e1')
    expect(saveBlob).toHaveBeenCalledWith(result.blob, result.filename)
    expect(wrapper.find('[data-testid="event-report-notice"]').text()).toContain(
      'Attendance CSV',
    )
  })

  it('exports the participants CSV and the report PDF', async () => {
    const csv = download('spring-fair-participants.csv')
    const pdf = download('spring-fair-report.pdf')
    vi.mocked(downloadParticipantsCsv).mockResolvedValue(csv)
    vi.mocked(downloadEventPdf).mockResolvedValue(pdf)

    const wrapper = await mountReport()
    await wrapper.find('[data-testid="export-participants-csv"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="export-report-pdf"]').trigger('click')
    await flushPromises()

    expect(downloadParticipantsCsv).toHaveBeenCalledWith('e1')
    expect(downloadEventPdf).toHaveBeenCalledWith('e1')
    expect(saveBlob).toHaveBeenCalledWith(csv.blob, csv.filename)
    expect(saveBlob).toHaveBeenCalledWith(pdf.blob, pdf.filename)
  })

  it('surfaces export failures', async () => {
    vi.mocked(downloadEventPdf).mockRejectedValue(new Error('export boom'))

    const wrapper = await mountReport()
    await wrapper.find('[data-testid="export-report-pdf"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="event-report-error"]').text()).toContain(
      'export boom',
    )
    expect(saveBlob).not.toHaveBeenCalled()
  })

  it('shows the error state when the report fails to load', async () => {
    vi.mocked(getEventReport).mockRejectedValue(new Error('load boom'))

    const wrapper = await mountReport()

    expect(wrapper.find('[data-testid="event-report-error"]').text()).toContain(
      'load boom',
    )
  })
})
