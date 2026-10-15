import { http } from './http'

export const REPORT_ROLES = ['Admin', 'Department Head'] as const

export interface SummaryReport {
  events: {
    total: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    byMonth: Record<string, number>
    byCampusScope: Record<'OnCampus' | 'OffCampus', number>
  }
}

export async function getSummary(): Promise<SummaryReport> {
  const { data } = await http.get<SummaryReport>('/reports/summary')
  return data
}
