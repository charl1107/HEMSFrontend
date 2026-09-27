// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScheduleSection from './ScheduleSection.vue'
import {
  createSchedule,
  listSchedule,
  removeSchedule,
  updateSchedule,
  type ScheduleRecord,
} from '../../../api/schedule.api'

vi.mock('../../../api/schedule.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/schedule.api')>()
  return {
    ...actual,
    listSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    removeSchedule: vi.fn(),
  }
})

function makeEntry(
  overrides: Partial<ScheduleRecord> = {},
): ScheduleRecord {
  return {
    id: 's1',
    eventId: 'e1',
    activityName: 'Opening ceremony',
    startTime: '2026-05-01T09:00:00.000Z',
    endTime: '2026-05-01T10:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function axiosLike(status: number, data: unknown): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  })
}

function mountSection(
  props: { status?: string; canManage?: boolean } = {},
): VueWrapper {
  return mount(ScheduleSection, {
    props: {
      eventId: 'e1',
      status: 'Planning',
      canManage: true,
      ...props,
    },
  })
}

async function fillForm(
  wrapper: VueWrapper,
  values: { activity: string; start: string; end: string },
): Promise<void> {
  await wrapper.find('[data-testid="schedule-activity"]').setValue(values.activity)
  await wrapper.find('[data-testid="schedule-start"]').setValue(values.start)
  await wrapper.find('[data-testid="schedule-end"]').setValue(values.end)
}

describe('ScheduleSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listSchedule).mockResolvedValue([])
  })

  it('gates on Rejected and skips loading', async () => {
    const wrapper = mountSection({ status: 'Rejected' })
    await flushPromises()

    const gate = wrapper.find('[data-testid="schedule-gated"]')
    expect(gate.exists()).toBe(true)
    expect(gate.text()).toContain('Rejected')
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(false)
    expect(listSchedule).not.toHaveBeenCalled()
  })

  it('blocks create when end time is not after start time', async () => {
    const wrapper = mountSection()
    await flushPromises()

    await fillForm(wrapper, {
      activity: 'Opening',
      start: '2026-05-01T09:00',
      end: '2026-05-01T09:00',
    })
    await wrapper.find('[data-testid="schedule-form"]').trigger('submit')
    await flushPromises()

    expect(createSchedule).not.toHaveBeenCalled()
    const error = wrapper.find('[data-testid="schedule-form-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('End time must be after start time')
  })

  it('creates a schedule entry with ISO times', async () => {
    vi.mocked(listSchedule)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeEntry()])
    vi.mocked(createSchedule).mockResolvedValue(makeEntry())

    const wrapper = mountSection()
    await flushPromises()

    await fillForm(wrapper, {
      activity: 'Opening ceremony',
      start: '2026-05-01T09:00',
      end: '2026-05-01T10:00',
    })
    await wrapper.find('[data-testid="schedule-form"]').trigger('submit')
    await flushPromises()

    expect(createSchedule).toHaveBeenCalledWith('e1', {
      activityName: 'Opening ceremony',
      startTime: new Date('2026-05-01T09:00').toISOString(),
      endTime: new Date('2026-05-01T10:00').toISOString(),
    })
    expect(wrapper.find('[data-testid="schedule-notice"]').text()).toContain(
      'added',
    )
    expect(listSchedule).toHaveBeenCalledTimes(2)
  })

  it('surfaces the server 400 message when the API rejects the times', async () => {
    vi.mocked(createSchedule).mockRejectedValue(
      axiosLike(400, { message: 'endTime must be after startTime' }),
    )

    const wrapper = mountSection()
    await flushPromises()

    await fillForm(wrapper, {
      activity: 'Opening',
      start: '2026-05-01T09:00',
      end: '2026-05-01T10:00',
    })
    await wrapper.find('[data-testid="schedule-form"]').trigger('submit')
    await flushPromises()

    const error = wrapper.find('[data-testid="schedule-error"]')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('endTime must be after startTime')
  })

  it('edits an existing entry through the shared form', async () => {
    vi.mocked(listSchedule)
      .mockResolvedValueOnce([makeEntry()])
      .mockResolvedValueOnce([
        makeEntry({ activityName: 'Keynote' }),
      ])
    vi.mocked(updateSchedule).mockResolvedValue(
      makeEntry({ activityName: 'Keynote' }),
    )

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="schedule-edit-s1"]').trigger('click')
    await wrapper
      .find('[data-testid="schedule-activity"]')
      .setValue('Keynote')
    await wrapper.find('[data-testid="schedule-form"]').trigger('submit')
    await flushPromises()

    expect(updateSchedule).toHaveBeenCalledWith('e1', 's1', {
      activityName: 'Keynote',
      startTime: '2026-05-01T09:00:00.000Z',
      endTime: '2026-05-01T10:00:00.000Z',
    })
    expect(wrapper.find('[data-testid="schedule-notice"]').text()).toContain(
      'updated',
    )
    expect(wrapper.find('[data-testid="schedule-cancel-edit"]').exists()).toBe(
      false,
    )
  })

  it('exits edit mode without saving on cancel', async () => {
    vi.mocked(listSchedule).mockResolvedValue([makeEntry()])

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="schedule-edit-s1"]').trigger('click')
    expect(wrapper.find('[data-testid="schedule-cancel-edit"]').exists()).toBe(
      true,
    )
    await wrapper.find('[data-testid="schedule-cancel-edit"]').trigger('click')
    await flushPromises()

    expect(updateSchedule).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="schedule-cancel-edit"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="schedule-activity"]').element
        .value,
    ).toBe('')
  })

  it('deletes an entry and refreshes the list', async () => {
    vi.mocked(listSchedule)
      .mockResolvedValueOnce([makeEntry()])
      .mockResolvedValueOnce([])
    vi.mocked(removeSchedule).mockResolvedValue()

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="schedule-row-s1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="schedule-delete-s1"]').trigger('click')
    await flushPromises()

    expect(removeSchedule).toHaveBeenCalledWith('e1', 's1')
    expect(wrapper.find('[data-testid="schedule-notice"]').text()).toContain(
      'deleted',
    )
    expect(wrapper.find('[data-testid="schedule-empty"]').exists()).toBe(true)
  })

  it('hides management controls for viewers without manage rights', async () => {
    vi.mocked(listSchedule).mockResolvedValue([makeEntry()])

    const wrapper = mountSection({ canManage: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="schedule-edit-s1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="schedule-delete-s1"]').exists()).toBe(
      false,
    )
    expect(wrapper.find('[data-testid="schedule-row-s1"]').exists()).toBe(true)
  })
})
