// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BulkImportStudents from './BulkImportStudents.vue'
import { createUser } from '../../../api/users.api'

vi.mock('../../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/users.api')>()
  return {
    ...actual,
    createUser: vi.fn(),
  }
})

const CSV =
  'role,studentId,firstName,lastName,email,program,yearLevel,password,isActive\nInstructor,,Jamie,Cruz,j@example.edu,,,'

async function uploadCsv(wrapper: VueWrapper): Promise<void> {
  const file = new File([CSV], 'users.csv', { type: 'text/csv' })
  const input = wrapper.find('[data-testid="bulk-import-file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
  // FileReader resolves on a task, not a microtask.
  await new Promise((resolve) => setTimeout(resolve, 0))
  await flushPromises()
}

describe('BulkImportStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the server message when a row fails', async () => {
    vi.mocked(createUser).mockRejectedValue(
      new Error('Admin role can only be granted directly in the database'),
    )
    const wrapper = mount(BulkImportStudents)
    await uploadCsv(wrapper)

    await wrapper.find('[data-testid="bulk-import-submit"]').trigger('click')
    await flushPromises()

    const row = wrapper.find('[data-testid="bulk-row-2"]')
    expect(row.text()).toContain('error')
    expect(row.text()).toContain('Admin role can only be granted directly in the database')
    expect(wrapper.emitted('imported')).toBeUndefined()
  })

  it('falls back to the generic row error when the failure carries no message', async () => {
    vi.mocked(createUser).mockRejectedValue(new Error(''))
    const wrapper = mount(BulkImportStudents)
    await uploadCsv(wrapper)

    await wrapper.find('[data-testid="bulk-import-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="bulk-row-2"]').text()).toContain(
      'Could not create this account. Check that its email and student ID are unique, then try again.',
    )
  })
})
