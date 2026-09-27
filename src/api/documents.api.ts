import { http } from './http'

export const DOC_MAX_BYTES = 10 * 1024 * 1024
export const DOC_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const
export const DOC_TYPES = [
  'Proposal',
  'Program',
  'Certificate',
  'Photo',
  'Report',
] as const
export type DocType = (typeof DOC_TYPES)[number]

export interface DocumentUserRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface DocumentRecord {
  id: string
  eventId: string
  uploadedById: string | null
  docType: DocType
  filePath: string
  originalFilename: string
  mimeType: string
  fileSize: number
  createdAt: string
  updatedAt: string
  uploadedBy: DocumentUserRef | null
}

export function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value)
}

export async function listDocuments(eventId: string): Promise<DocumentRecord[]> {
  const { data } = await http.get<DocumentRecord[]>(`/events/${eventId}/documents`)
  return data
}

export async function uploadDocument(
  eventId: string,
  file: File,
  docType: DocType,
): Promise<DocumentRecord> {
  const form = new FormData()
  form.append('file', file)
  form.append('docType', docType)
  const { data } = await http.post<DocumentRecord>(
    `/events/${eventId}/documents`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function downloadDocument(
  eventId: string,
  id: string,
): Promise<Blob> {
  const { data } = await http.get<Blob>(
    `/events/${eventId}/documents/${id}/download`,
    { responseType: 'blob' },
  )
  return data
}

export async function removeDocument(
  eventId: string,
  id: string,
): Promise<void> {
  await http.delete(`/events/${eventId}/documents/${id}`)
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
