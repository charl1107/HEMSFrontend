import { http } from './http'

export const REPORT_ROLES = ['Admin', 'Department Head'] as const

export interface SummaryCountRow {
  status: string
  count: number
}

export interface SummaryTypeRow {
  type: string
  count: number
}

export interface SummaryAttendanceEventRow {
  eventId: string
  title: string
  status: string
  registered: number
  present: number
  absent: number
  missing: number
  presentRate: number
  absentRate: number
}

export interface SummaryReport {
  events: {
    total: number
    completed: number
    byStatus: SummaryCountRow[]
    byType: SummaryTypeRow[]
  }
  participants: {
    total: number
    byType: SummaryTypeRow[]
  }
  attendance: {
    present: number
    absent: number
    recorded: number
    presentRate: number
    absentRate: number
    byEvent: SummaryAttendanceEventRow[]
  }
  tasks: { total: number; done: number; completionRate: number }
  absenteeDefinition: string
}

export interface EventReportParticipantRow {
  participantId: string
  name: string
  participantType: string
  email: string | null
  attendanceStatus: 'Present' | 'Absent' | null
  timeIn: string | null
  timeOut: string | null
  isAbsentee: boolean
  absenteeReason: string | null
}

export interface EventReport {
  event: {
    id: string
    title: string
    status: string
    eventDate: string
    venue: string
    eventType: string | null
    description: string | null
  }
  participantTypes: SummaryTypeRow[]
  stats: {
    registered: number
    present: number
    absent: number
    missing: number
    absentees: number
    presentRate: number
    absentRate: number
  }
  participants: EventReportParticipantRow[]
  absentees: EventReportParticipantRow[]
  tasks: { total: number; done: number; completionRate: number }
  absenteeDefinition: string
}

export interface ReportDownload {
  blob: Blob
  filename: string
}

export async function getSummary(): Promise<SummaryReport> {
  const { data } = await http.get<SummaryReport>('/reports/summary')
  return data
}

export async function getEventReport(eventId: string): Promise<EventReport> {
  const { data } = await http.get<EventReport>(
    `/reports/events/${eventId}/summary`,
  )
  return data
}

function filenameFromDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      /* fall through to plain filename */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? fallback
}

async function downloadFile(
  url: string,
  fallbackFilename: string,
): Promise<ReportDownload> {
  const response = await http.get<Blob>(url, { responseType: 'blob' })
  const disposition = response.headers['content-disposition']
  return {
    blob: response.data,
    filename: filenameFromDisposition(
      typeof disposition === 'string' ? disposition : undefined,
      fallbackFilename,
    ),
  }
}

export function downloadAttendanceCsv(eventId: string): Promise<ReportDownload> {
  return downloadFile(
    `/reports/events/${eventId}/attendance.csv`,
    'attendance.csv',
  )
}

export function downloadParticipantsCsv(eventId: string): Promise<ReportDownload> {
  return downloadFile(
    `/reports/events/${eventId}/participants.csv`,
    'participants.csv',
  )
}

export function downloadEventPdf(eventId: string): Promise<ReportDownload> {
  return downloadFile(`/reports/events/${eventId}/report.pdf`, 'report.pdf')
}
