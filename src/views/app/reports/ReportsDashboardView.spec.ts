// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsDashboardView from './ReportsDashboardView.vue'
import { getSummary, type SummaryReport } from '../../../api/reports.api'
import { expectSequentialHeadings } from '../../../test-utils/headings'

vi.mock('../../../api/reports.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/reports.api')>()
  return {
    ...actual,
    getSummary: vi.fn(),
  }
})

function makeSummary(overrides: Partial<SummaryReport> = {}): SummaryReport {
  return {
    events: {
      total: 3,
      byStatus: { Planning: 1, Ongoing: 1, Completed: 1 },
      byType: { Workshop: 2, Seminar: 1 },
      byMonth: { '2026-06': 2, '2026-07': 1 },
      byCampusScope: { OnCampus: 2, OffCampus: 1 },
    },
    tasks: { total: 5, done: 2, completionRate: 40 },
    ...overrides,
  }
}

async function mountDashboard(): Promise<VueWrapper> {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'reports-dashboard', component: ReportsDashboardView },
    ],
  })
  await router.push({ name: 'reports-dashboard' })
  await router.isReady()
  const wrapper = mount(ReportsDashboardView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('ReportsDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSummary).mockResolvedValue(makeSummary())
  })

  it('renders overview stats from the summary', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stat-events"]').text()).toBe('3')
    // completionRate is a percentage to 1 decimal, not a 0–1 fraction.
    expect(wrapper.find('[data-testid="stat-task-rate"]').text()).toBe('40%')
  })

  it('renders the five statistics tables', async () => {
    const wrapper = await mountDashboard()

    const status = wrapper.find('[data-testid="reports-by-status"]')
    expect(status.text()).toContain('Planning')
    expect(status.text()).toContain('Completed')

    const type = wrapper.find('[data-testid="reports-by-type"]')
    expect(type.text()).toContain('Workshop')
    expect(type.text()).toContain('2')

    // byMonth keys are YYYY-MM strings; June has 2 events.
    const month = wrapper.find('[data-testid="reports-by-month"]')
    expect(month.text()).toContain('2026-06')
    expect(month.text()).toContain('2')

    const campus = wrapper.find('[data-testid="reports-by-campus"]')
    expect(campus.text()).toContain('Inside campus')
    expect(campus.text()).toContain('Outside campus')

    const tasks = wrapper.find('[data-testid="reports-tasks"]')
    expect(tasks.text()).toContain('2')
    expect(tasks.text()).toContain('5')
    expect(tasks.text()).toContain('40%')
  })

  it('still shows categories with a zero count', async () => {
    vi.mocked(getSummary).mockResolvedValue(
      makeSummary({
        events: {
          total: 0,
          byStatus: { Planning: 0, Cancelled: 0 },
          byType: {},
          byMonth: {},
          byCampusScope: { OnCampus: 0, OffCampus: 0 },
        },
      }),
    )

    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-by-status"]').text()).toContain('Planning')
    expect(wrapper.find('[data-testid="reports-by-status"]').text()).toContain('Cancelled')
  })

  it('renders no attendance, absentee or department data', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.text()).not.toMatch(/Attend|Absent|Department/)
  })

  it('shows the error state when the summary fails to load', async () => {
    vi.mocked(getSummary).mockRejectedValue(new Error('boom'))

    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-error"]').text()).toContain('boom')
  })

  it('renders headings in sequential order (axe heading-order)', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-dashboard"]').exists()).toBe(true)
    expectSequentialHeadings(wrapper)
  })
})
