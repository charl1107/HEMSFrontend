// @vitest-environment happy-dom
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
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

// Cells of the row whose first column equals `key` — keeps assertions value-scoped,
// so a count of 0 or 5 can never satisfy a `toContain('2')` style check.
function rowCells(section: DOMWrapper<Element>, key: string): string[] | undefined {
  const row = section.findAll('tbody tr').find((tr) => tr.findAll('td')[0]?.text().trim() === key)
  return row?.findAll('td').map((td) => td.text().trim())
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

  it('renders the five statistics tables with the expected counts', async () => {
    const wrapper = await mountDashboard()

    const status = wrapper.find('[data-testid="reports-by-status"]')
    // Row-scoped count assertions: a count of 0 or 5 must fail these.
    expect(rowCells(status, 'Planning')).toEqual(['Planning', '1'])
    expect(rowCells(status, 'Ongoing')).toEqual(['Ongoing', '1'])
    expect(rowCells(status, 'Completed')).toEqual(['Completed', '1'])

    const type = wrapper.find('[data-testid="reports-by-type"]')
    expect(rowCells(type, 'Workshop')).toEqual(['Workshop', '2'])
    expect(rowCells(type, 'Seminar')).toEqual(['Seminar', '1'])

    // byMonth keys are YYYY-MM strings; June has 2 events. Keyed lookup, so a
    // June count of 0 or 5 cannot pass via the "2" inside "2026-06".
    const month = wrapper.find('[data-testid="reports-by-month"]')
    expect(rowCells(month, '2026-06')).toEqual(['2026-06', '2'])
    expect(rowCells(month, '2026-07')).toEqual(['2026-07', '1'])

    const campus = wrapper.find('[data-testid="reports-by-campus"]')
    expect(rowCells(campus, 'Inside campus')).toEqual(['Inside campus', '2'])
    expect(rowCells(campus, 'Outside campus')).toEqual(['Outside campus', '1'])

    // The task table's single row has no label column: cells are Done/Total/Rate.
    // Keyed on the Done cell via rowCells, so a swapped or misrowed count fails.
    const tasks = wrapper.find('[data-testid="reports-tasks"]')
    expect(rowCells(tasks, '2')).toEqual(['2', '5', '40%'])
  })

  it('still shows categories with a zero count', async () => {
    vi.mocked(getSummary).mockResolvedValue(
      makeSummary({
        events: {
          total: 0,
          byStatus: { Planning: 0, Cancelled: 0 },
          byType: { Workshop: 0 },
          byMonth: { '2026-08': 0 },
          byCampusScope: { OnCampus: 0, OffCampus: 0 },
        },
      }),
    )

    const wrapper = await mountDashboard()

    expect(rowCells(wrapper.find('[data-testid="reports-by-status"]'), 'Planning')).toEqual([
      'Planning',
      '0',
    ])
    expect(rowCells(wrapper.find('[data-testid="reports-by-status"]'), 'Cancelled')).toEqual([
      'Cancelled',
      '0',
    ])
    expect(rowCells(wrapper.find('[data-testid="reports-by-type"]'), 'Workshop')).toEqual([
      'Workshop',
      '0',
    ])
    expect(rowCells(wrapper.find('[data-testid="reports-by-month"]'), '2026-08')).toEqual([
      '2026-08',
      '0',
    ])
    expect(rowCells(wrapper.find('[data-testid="reports-by-campus"]'), 'Inside campus')).toEqual([
      'Inside campus',
      '0',
    ])
    expect(rowCells(wrapper.find('[data-testid="reports-by-campus"]'), 'Outside campus')).toEqual([
      'Outside campus',
      '0',
    ])
  })

  it('renders a friendly label instead of the raw scope for an unknown campus key', async () => {
    vi.mocked(getSummary).mockResolvedValue(
      makeSummary({
        events: {
          total: 0,
          byStatus: {},
          byType: {},
          byMonth: {},
          // Deliberately out-of-contract data: the label must not leak the raw enum.
          byCampusScope: { OnCampus: 0, OffCampus: 0, SkyCampus: 7 } as unknown as SummaryReport['events']['byCampusScope'],
        },
      }),
    )

    const wrapper = await mountDashboard()

    const campus = wrapper.find('[data-testid="reports-by-campus"]')
    expect(campus.text()).not.toContain('SkyCampus')
    expect(rowCells(campus, 'Other location')).toEqual(['Other location', '7'])
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
