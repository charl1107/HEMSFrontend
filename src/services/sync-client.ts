import { syncAttendance, type SyncRejection } from '../api/attendance.api'
import {
  listPendingRecords,
  markRejected,
  markSynced,
} from './attendance-queue'

export interface FlushResult {
  sent: number
  accepted: string[]
  rejected: SyncRejection[]
  remainingPending: number
}

export const syncClient = {
  async flush(): Promise<FlushResult> {
    const pending = await listPendingRecords()
    if (!pending.length) {
      return { sent: 0, accepted: [], rejected: [], remainingPending: 0 }
    }

    const records = pending.map((record) => {
      const payload = {
        clientRecordId: record.clientRecordId,
        eventId: record.eventId,
        participantId: record.participantId,
        status: record.status,
        deviceId: record.deviceId,
        recordedAt: record.recordedAt,
      } as const
      return record.timeIn || record.timeOut
        ? { ...payload, ...(record.timeIn ? { timeIn: record.timeIn } : {}), ...(record.timeOut ? { timeOut: record.timeOut } : {}) }
        : payload
    })

    const result = await syncAttendance(records)

    await markSynced(result.accepted)
    for (const rejection of result.rejected) {
      await markRejected(rejection.clientRecordId, rejection.reason)
    }

    const remaining = await listPendingRecords()
    return {
      sent: pending.length,
      accepted: result.accepted,
      rejected: result.rejected,
      remainingPending: remaining.length,
    }
  },
}
