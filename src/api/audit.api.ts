import { http } from './http'

export interface AuditUserRef {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface AuditLogItem {
  id: string
  userId: string | null
  user: AuditUserRef | null
  method: string
  path: string
  entity: string
  action: string
  body: unknown
  statusCode: number | null
  createdAt: string
}

export interface AuditLogPage {
  items: AuditLogItem[]
  total: number
  page: number
  pageSize: number
}

export interface AuditLogFilters {
  userId?: string
  entity?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogPage> {
  const params: Record<string, string | number> = {}
  if (filters.userId) params.userId = filters.userId
  if (filters.entity) params.entity = filters.entity
  if (filters.action) params.action = filters.action
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  params.page = filters.page ?? 1
  params.pageSize = filters.pageSize ?? 20
  const { data } = await http.get<AuditLogPage>('/audit', { params })
  return data
}

export function summarizeAuditBody(body: unknown): string {
  if (body === null || body === undefined) return '—'
  if (typeof body !== 'object') return String(body)
  const entries = Object.entries(body as Record<string, unknown>)
  if (!entries.length) return '—'
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}=${formatScalar(value)}`)
    .join(', ')
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'object') return Array.isArray(value) ? '[…]' : '{…}'
  return String(value)
}
