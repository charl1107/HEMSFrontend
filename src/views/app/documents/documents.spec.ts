import { describe, expect, it } from 'vitest'
import type { DocumentRecord } from '../../../api/documents.api'
import {
  formatFileSize,
  groupDocumentsByType,
  precheckDocumentFile,
} from './documents'

function makeDoc(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: 'd1',
    eventId: 'e1',
    uploadedById: 'u1',
    docType: 'Proposal',
    filePath: 'e1/x.pdf',
    originalFilename: 'plan.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    uploadedBy: null,
    ...overrides,
  }
}

describe('precheckDocumentFile', () => {
  it('accepts an allowed mime type within the size limit', () => {
    expect(
      precheckDocumentFile({ type: 'application/pdf', size: 1024 }),
    ).toEqual({ ok: true })
    expect(
      precheckDocumentFile({
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024,
      }),
    ).toEqual({ ok: true })
  })

  it('rejects a disallowed mime type', () => {
    const result = precheckDocumentFile({ type: 'text/plain', size: 100 })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('Document must be one of')
  })

  it('rejects a file larger than 10MB', () => {
    const result = precheckDocumentFile({
      type: 'application/pdf',
      size: 10 * 1024 * 1024 + 1,
    })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('10MB or smaller')
  })

  it('rejects an empty file', () => {
    const result = precheckDocumentFile({ type: 'application/pdf', size: 0 })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('empty')
  })
})

describe('groupDocumentsByType', () => {
  it('groups documents under their type in DOC_TYPES order', () => {
    const groups = groupDocumentsByType([
      makeDoc({ id: 'd1', docType: 'Photo' }),
      makeDoc({ id: 'd2', docType: 'Proposal' }),
      makeDoc({ id: 'd3', docType: 'Proposal' }),
      makeDoc({ id: 'd4', docType: 'Report' }),
    ])

    expect(groups.map((group) => group.docType)).toEqual([
      'Proposal',
      'Photo',
      'Report',
    ])
    expect(groups[0].documents.map((doc) => doc.id)).toEqual(['d2', 'd3'])
    expect(groups[1].documents.map((doc) => doc.id)).toEqual(['d1'])
    expect(groups[2].documents.map((doc) => doc.id)).toEqual(['d4'])
  })

  it('returns an empty array for no documents', () => {
    expect(groupDocumentsByType([])).toEqual([])
  })

  it('omits types with no documents', () => {
    const groups = groupDocumentsByType([makeDoc({ docType: 'Certificate' })])
    expect(groups).toHaveLength(1)
    expect(groups[0].docType).toBe('Certificate')
  })
})

describe('formatFileSize', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
