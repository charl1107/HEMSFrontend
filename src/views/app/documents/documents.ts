import {
  DOC_ALLOWED_MIME,
  DOC_MAX_BYTES,
  DOC_TYPES,
  type DocType,
  type DocumentRecord,
} from '../../../api/documents.api'

export interface DocumentFileCheck {
  ok: boolean
  message?: string
}

export function precheckDocumentFile(file: {
  type: string
  size: number
}): DocumentFileCheck {
  if (!(DOC_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: `Document must be one of: ${DOC_ALLOWED_MIME.join(', ')}`,
    }
  }
  if (file.size > DOC_MAX_BYTES) {
    return { ok: false, message: 'Document must be 10MB or smaller' }
  }
  if (file.size === 0) {
    return { ok: false, message: 'Document file is empty' }
  }
  return { ok: true }
}

export interface DocumentGroup {
  docType: DocType
  documents: DocumentRecord[]
}

export function groupDocumentsByType(
  documents: DocumentRecord[],
): DocumentGroup[] {
  const byType = new Map<DocType, DocumentRecord[]>()
  for (const doc of documents) {
    const bucket = byType.get(doc.docType)
    if (bucket) {
      bucket.push(doc)
    } else {
      byType.set(doc.docType, [doc])
    }
  }
  return DOC_TYPES.filter((docType) => byType.has(docType)).map((docType) => ({
    docType,
    documents: byType.get(docType)!,
  }))
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
