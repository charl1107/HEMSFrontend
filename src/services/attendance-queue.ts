import type {
  AttendanceRecord,
  AttendanceStatus,
  SyncAttendanceRecord,
} from '../api/attendance.api'
import type { ParticipantRecord } from '../api/participants.api'

const DB_NAME = 'hems-offline'
const DB_VERSION = 1
const QUEUE_STORE = 'attendance-queue'
const ROSTER_STORE = 'roster'
const CLIENT_ID_KEY = 'clientRecordId'
const EVENT_ID_KEY = 'eventId'

export type SyncState = 'pending' | 'synced' | 'rejected'

export interface QueuedAttendanceRecord {
  clientRecordId: string
  eventId: string
  participantId: string
  participantName: string
  status: AttendanceStatus
  timeIn?: string
  timeOut?: string
  deviceId: string
  recordedAt: string
  syncState: SyncState
  rejectReason?: string
}

export interface RosterSnapshot {
  eventId: string
  participants: ParticipantRecord[]
  attendance: AttendanceRecord[]
  cachedAt: string
}

export interface RejectionInfo {
  clientRecordId: string
  reason: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: CLIENT_ID_KEY })
      }
      if (!db.objectStoreNames.contains(ROSTER_STORE)) {
        db.createObjectStore(ROSTER_STORE, { keyPath: EVENT_ID_KEY })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error('Failed to open attendance queue database'))
    }
  })
  return dbPromise
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export function toSyncRecord(record: QueuedAttendanceRecord): SyncAttendanceRecord {
  const payload: SyncAttendanceRecord = {
    clientRecordId: record.clientRecordId,
    eventId: record.eventId,
    participantId: record.participantId,
    status: record.status,
    deviceId: record.deviceId,
    recordedAt: record.recordedAt,
  }
  if (record.timeIn) payload.timeIn = record.timeIn
  if (record.timeOut) payload.timeOut = record.timeOut
  return payload
}

export async function enqueue(
  record: Omit<QueuedAttendanceRecord, 'syncState' | 'rejectReason'>,
): Promise<'queued' | 'exists'> {
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readwrite')
  const store = tx.objectStore(QUEUE_STORE)
  const existing = await requestToPromise(store.get(record.clientRecordId))
  if (existing) {
    await transactionDone(tx)
    return 'exists'
  }
  store.put({ ...record, syncState: 'pending' as const })
  await transactionDone(tx)
  return 'queued'
}

export async function listPendingRecords(): Promise<QueuedAttendanceRecord[]> {
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readonly')
  const all = await requestToPromise(
    tx.objectStore(QUEUE_STORE).getAll() as IDBRequest<QueuedAttendanceRecord[]>,
  )
  return all.filter((record) => record.syncState === 'pending')
}

export async function listRejectedRecords(): Promise<QueuedAttendanceRecord[]> {
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readonly')
  const all = await requestToPromise(
    tx.objectStore(QUEUE_STORE).getAll() as IDBRequest<QueuedAttendanceRecord[]>,
  )
  return all.filter((record) => record.syncState === 'rejected')
}

export async function listQueueRecords(): Promise<QueuedAttendanceRecord[]> {
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readonly')
  return requestToPromise(
    tx.objectStore(QUEUE_STORE).getAll() as IDBRequest<QueuedAttendanceRecord[]>,
  )
}

export async function countPending(): Promise<number> {
  const pending = await listPendingRecords()
  return pending.length
}

export async function markSynced(clientRecordIds: string[]): Promise<void> {
  if (!clientRecordIds.length) return
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readwrite')
  const store = tx.objectStore(QUEUE_STORE)
  for (const id of clientRecordIds) {
    const existing = (await requestToPromise(store.get(id))) as
      | QueuedAttendanceRecord
      | undefined
    if (!existing) continue
    store.put({
      ...existing,
      syncState: 'synced' as const,
      rejectReason: undefined,
    })
  }
  await transactionDone(tx)
}

export async function markRejected(
  clientRecordId: string,
  reason: string,
): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(QUEUE_STORE, 'readwrite')
  const store = tx.objectStore(QUEUE_STORE)
  const existing = (await requestToPromise(store.get(clientRecordId))) as
    | QueuedAttendanceRecord
    | undefined
  if (existing) {
    store.put({ ...existing, syncState: 'rejected' as const, rejectReason: reason })
  }
  await transactionDone(tx)
}

export async function saveRosterSnapshot(snapshot: RosterSnapshot): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(ROSTER_STORE, 'readwrite')
  tx.objectStore(ROSTER_STORE).put(snapshot)
  await transactionDone(tx)
}

export async function loadRosterSnapshot(
  eventId: string,
): Promise<RosterSnapshot | null> {
  const db = await openDb()
  const tx = db.transaction(ROSTER_STORE, 'readonly')
  const snapshot = await requestToPromise(
    tx.objectStore(ROSTER_STORE).get(eventId) as IDBRequest<RosterSnapshot | undefined>,
  )
  return snapshot ?? null
}

export function rejectionsFrom(records: QueuedAttendanceRecord[]): RejectionInfo[] {
  return records
    .filter((record) => record.syncState === 'rejected' && record.rejectReason)
    .map((record) => ({
      clientRecordId: record.clientRecordId,
      reason: record.rejectReason as string,
    }))
}

export async function resetAttendanceQueueForTests(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null)
    db?.close()
    dbPromise = null
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('deleteDatabase failed'))
    request.onblocked = () => resolve()
  })
}
