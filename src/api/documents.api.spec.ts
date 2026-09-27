import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import {
  downloadDocument,
  isDocType,
  listDocuments,
  removeDocument,
  uploadDocument,
} from './documents.api'

vi.mock('./http', () => ({
  http: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

describe('listDocuments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /events/:eventId/documents and returns the payload', async () => {
    const docs = [{ id: 'd1' }]
    vi.mocked(http.get).mockResolvedValue({ data: docs })

    await expect(listDocuments('e1')).resolves.toEqual(docs)
    expect(http.get).toHaveBeenCalledWith('/events/e1/documents')
  })
})

describe('uploadDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs multipart form with file field and docType field', async () => {
    const created = { id: 'd1', docType: 'Proposal' }
    vi.mocked(http.post).mockResolvedValue({ data: created })
    const file = new File(['x'], 'plan.pdf', { type: 'application/pdf' })

    await expect(uploadDocument('e1', file, 'Proposal')).resolves.toEqual(
      created,
    )

    const [url, form, config] = vi.mocked(http.post).mock.calls[0] as [
      string,
      FormData,
      { headers: Record<string, string> },
    ]
    expect(url).toBe('/events/e1/documents')
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('file')).toBe(file)
    expect(form.get('docType')).toBe('Proposal')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')
  })
})

describe('downloadDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs the download URL as a blob', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' })
    vi.mocked(http.get).mockResolvedValue({ data: blob })

    await expect(downloadDocument('e1', 'd1')).resolves.toBe(blob)
    expect(http.get).toHaveBeenCalledWith(
      '/events/e1/documents/d1/download',
      { responseType: 'blob' },
    )
  })
})

describe('removeDocument', () => {
  beforeEach(() => vi.clearAllMocks())

  it('DELETEs /events/:eventId/documents/:id', async () => {
    vi.mocked(http.delete).mockResolvedValue({})

    await removeDocument('e1', 'd1')
    expect(http.delete).toHaveBeenCalledWith('/events/e1/documents/d1')
  })
})

describe('isDocType', () => {
  it('accepts the five backend doc types', () => {
    expect(isDocType('Proposal')).toBe(true)
    expect(isDocType('Program')).toBe(true)
    expect(isDocType('Certificate')).toBe(true)
    expect(isDocType('Photo')).toBe(true)
    expect(isDocType('Report')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isDocType('proposal')).toBe(false)
    expect(isDocType('')).toBe(false)
  })
})
