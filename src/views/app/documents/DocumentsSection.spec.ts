// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DocumentsSection from './DocumentsSection.vue'
import {
  downloadDocument,
  listDocuments,
  removeDocument,
  saveBlob,
  uploadDocument,
  type DocumentRecord,
} from '../../../api/documents.api'

vi.mock('../../../api/documents.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/documents.api')>()
  return {
    ...actual,
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    downloadDocument: vi.fn(),
    removeDocument: vi.fn(),
    saveBlob: vi.fn(),
  }
})

function makeDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'd1',
    eventId: 'e1',
    uploadedById: 'u1',
    docType: 'Proposal',
    filePath: 'e1/x.pdf',
    originalFilename: 'plan.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    uploadedBy: {
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@x.com',
    },
    ...overrides,
  }
}

function setFile(
  wrapper: VueWrapper,
  file: File | null,
): Promise<void> {
  const input = wrapper.find<HTMLInputElement>('[data-testid="document-file-input"]')
  const files = file ? [file] : []
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  })
  return input.trigger('change')
}

function mountSection(
  props: { status?: string; canManage?: boolean } = {},
): VueWrapper {
  return mount(DocumentsSection, {
    props: {
      eventId: 'e1',
      status: 'Planning',
      canManage: true,
      ...props,
    },
  })
}

describe('DocumentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listDocuments).mockResolvedValue([])
  })

  it('loads and renders documents grouped by type', async () => {
    vi.mocked(listDocuments).mockResolvedValue([
      makeDoc({ id: 'd1', docType: 'Proposal' }),
      makeDoc({
        id: 'd2',
        docType: 'Photo',
        originalFilename: 'fair.png',
        mimeType: 'image/png',
      }),
      makeDoc({ id: 'd3', docType: 'Proposal', originalFilename: 'plan2.pdf' }),
    ])

    const wrapper = mountSection()
    await flushPromises()

    const proposalGroup = wrapper.find(
      '[data-testid="documents-group-Proposal"]',
    )
    const photoGroup = wrapper.find('[data-testid="documents-group-Photo"]')
    expect(proposalGroup.exists()).toBe(true)
    expect(photoGroup.exists()).toBe(true)
    expect(
      proposalGroup.findAll('[data-testid^="document-row-"]'),
    ).toHaveLength(2)
    expect(
      photoGroup.findAll('[data-testid^="document-row-"]'),
    ).toHaveLength(1)
    expect(wrapper.find('[data-testid="documents-empty"]').exists()).toBe(false)
  })

  it('shows the empty state when there are no documents', async () => {
    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="documents-empty"]').exists()).toBe(true)
  })

  it('rejects a bad file type before any upload call', async () => {
    const wrapper = mountSection()
    await flushPromises()

    await setFile(wrapper, new File(['x'], 'notes.txt', { type: 'text/plain' }))
    await flushPromises()

    expect(wrapper.find('[data-testid="documents-error"]').text()).toContain(
      'Document must be one of',
    )
    expect(uploadDocument).not.toHaveBeenCalled()
    expect(
      wrapper.find<HTMLButtonElement>('[data-testid="document-upload"]')
        .element.disabled,
    ).toBe(true)
  })

  it('rejects an oversized file before any upload call', async () => {
    const wrapper = mountSection()
    await flushPromises()

    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    await setFile(wrapper, big)
    await flushPromises()

    expect(wrapper.find('[data-testid="documents-error"]').text()).toContain(
      '10MB or smaller',
    )
    expect(uploadDocument).not.toHaveBeenCalled()
  })

  it('uploads a valid file with the selected docType', async () => {
    vi.mocked(listDocuments)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeDoc()])
    vi.mocked(uploadDocument).mockResolvedValue(makeDoc())

    const wrapper = mountSection()
    await flushPromises()

    const file = new File(['%PDF-'], 'plan.pdf', { type: 'application/pdf' })
    await setFile(wrapper, file)
    await wrapper.find('[data-testid="document-doc-type"]').setValue('Report')
    expect(
      wrapper.find<HTMLButtonElement>('[data-testid="document-upload"]').element
        .disabled,
    ).toBe(false)

    await wrapper.find('[data-testid="document-upload-form"]').trigger('submit')
    await flushPromises()

    expect(uploadDocument).toHaveBeenCalledWith('e1', file, 'Report')
    expect(wrapper.find('[data-testid="documents-notice"]').text()).toContain(
      'uploaded',
    )
    expect(wrapper.find('[data-testid="document-row-d1"]').exists()).toBe(true)
  })

  it('downloads through the authenticated blob endpoint and saves it', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(listDocuments).mockResolvedValue([makeDoc()])
    vi.mocked(downloadDocument).mockResolvedValue(blob)

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="document-download-d1"]').trigger('click')
    await flushPromises()

    expect(downloadDocument).toHaveBeenCalledWith('e1', 'd1')
    expect(saveBlob).toHaveBeenCalledWith(blob, 'plan.pdf')
  })

  it('deletes a document and refreshes the list', async () => {
    vi.mocked(listDocuments)
      .mockResolvedValueOnce([makeDoc()])
      .mockResolvedValueOnce([])
    vi.mocked(removeDocument).mockResolvedValue()

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="document-delete-d1"]').trigger('click')
    await flushPromises()

    expect(removeDocument).toHaveBeenCalledWith('e1', 'd1')
    expect(wrapper.find('[data-testid="documents-notice"]').text()).toContain(
      'deleted',
    )
    expect(wrapper.find('[data-testid="documents-empty"]').exists()).toBe(true)
  })

  it('hides upload and delete for viewers without manage rights', async () => {
    vi.mocked(listDocuments).mockResolvedValue([makeDoc()])

    const wrapper = mountSection({ canManage: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="document-upload-form"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="document-delete-d1"]').exists(),
    ).toBe(false)
    expect(
      wrapper.find('[data-testid="document-download-d1"]').exists(),
    ).toBe(true)
    expect(wrapper.find('[data-testid="document-row-d1"]').exists()).toBe(true)
  })

  it('gates upload and delete when the event is Cancelled', async () => {
    vi.mocked(listDocuments).mockResolvedValue([makeDoc()])

    const wrapper = mountSection({ status: 'Cancelled' })
    await flushPromises()

    expect(wrapper.find('[data-testid="documents-gated"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="document-upload-form"]').exists()).toBe(
      false,
    )
    expect(
      wrapper.find('[data-testid="document-delete-d1"]').exists(),
    ).toBe(false)
    expect(
      wrapper.find('[data-testid="document-download-d1"]').exists(),
    ).toBe(true)
  })

  it('surfaces list failures', async () => {
    vi.mocked(listDocuments).mockRejectedValue(new Error('boom'))

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="documents-error"]').text()).toContain(
      'boom',
    )
  })
})
