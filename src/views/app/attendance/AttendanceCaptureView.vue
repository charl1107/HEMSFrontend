<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { isAxiosError } from 'axios'
import { Button, Card, OfflineBadge, StatusBadge } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import {
  listAttendance,
  timeIn,
  timeOut,
  type AttendanceRecord,
} from '../../../api/attendance.api'
import { getEvent, type EventRecord } from '../../../api/events.api'
import {
  listParticipants,
  participantDisplayName,
  type ParticipantRecord,
} from '../../../api/participants.api'
import {
  countPending,
  enqueue,
  listPendingRecords,
  listRejectedRecords,
  loadRosterSnapshot,
  saveRosterSnapshot,
  type QueuedAttendanceRecord,
} from '../../../services/attendance-queue'
import { getDeviceId, newClientRecordId } from '../../../services/device-id'
import { syncClient } from '../../../services/sync-client'
import { useOnlineStatus } from '../../../composables/useOnlineStatus'

const route = useRoute()
const { online } = useOnlineStatus()

const eventId = computed(() => String(route.params.id))
const event = ref<EventRecord | null>(null)
const participants = ref<ParticipantRecord[]>([])
const attendance = ref<AttendanceRecord[]>([])
const pendingCount = ref(0)
const rejected = ref<{ key: string; name: string; reason: string }[]>([])
const loading = ref(false)
const flushing = ref(false)
const fromCache = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const rosterSearch = ref('')
const statusFilter = ref<'All' | 'Pending Time-In' | 'Present'>('All')

const attendanceByParticipant = computed(() => {
  const map = new Map<string, AttendanceRecord>()
  for (const row of attendance.value) map.set(row.participantId, row)
  return map
})

interface RosterRow {
  participant: ParticipantRecord
  record: AttendanceRecord | null
  canTimeIn: boolean
  canTimeOut: boolean
}

const rows = computed<RosterRow[]>(() =>
  participants.value.map((participant) => {
    const record = attendanceByParticipant.value.get(participant.id) ?? null
    return {
      participant,
      record,
      canTimeIn: record === null || record.timeIn === null,
      canTimeOut: record !== null && record.timeIn !== null && record.timeOut === null,
    }
  }),
)

const filteredRows = computed<RosterRow[]>(() => {
  let list = rows.value
  const query = rosterSearch.value.trim().toLowerCase()
  if (query) {
    list = list.filter((row) => {
      const name = participantDisplayName(row.participant).toLowerCase()
      const email = row.participant.user?.email.toLowerCase() ?? ''
      const studentId = row.participant.user?.id.toLowerCase() ?? ''
      return name.includes(query) || email.includes(query) || studentId.includes(query)
    })
  }

  if (statusFilter.value === 'Pending Time-In') {
    list = list.filter((row) => row.canTimeIn)
  } else if (statusFilter.value === 'Present') {
    list = list.filter((row) => row.record && row.record.timeIn !== null)
  }

  return list
})

function isNetworkError(err: unknown): boolean {
  return isAxiosError(err) && !err.response
}

function displayTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString()
}

async function refreshPendingCount(): Promise<void> {
  pendingCount.value = await countPending()
}

async function refreshRejected(): Promise<void> {
  const records = await listRejectedRecords()
  const names = new Map(
    participants.value.map((p) => [p.id, participantDisplayName(p)]),
  )
  rejected.value = records.map((record, index) => ({
    key: `${record.clientRecordId}-${index}`,
    name: names.get(record.participantId) ?? record.participantName,
    reason: record.rejectReason ?? 'Rejected by server',
  }))
}

async function recordLocal(
  participant: ParticipantRecord,
  kind: 'time-in' | 'time-out',
): Promise<void> {
  error.value = null
  notice.value = null
  const now = new Date().toISOString()
  const clientRecordId = newClientRecordId()
  const existing = attendanceByParticipant.value.get(participant.id)

  if (online.value) {
    try {
      const updated =
        kind === 'time-in'
          ? await timeIn(eventId.value, participant.id)
          : await timeOut(eventId.value, participant.id)
      const idx = attendance.value.findIndex((row) => row.participantId === updated.participantId)
      if (idx >= 0) attendance.value[idx] = updated
      else attendance.value.push(updated)
      notice.value =
        kind === 'time-in'
          ? `${participantDisplayName(participant)} timed in.`
          : `${participantDisplayName(participant)} timed out.`
      return
    } catch (err) {
      if (!isNetworkError(err)) {
        error.value = apiErrorMessage(err, 'Failed to record attendance')
        return
      }
      // Network dropped mid-request — fall through to offline queue.
    }
  }

  const queued: Omit<QueuedAttendanceRecord, 'syncState' | 'rejectReason'> = {
    clientRecordId,
    eventId: eventId.value,
    participantId: participant.id,
    participantName: participantDisplayName(participant),
    status: 'Present',
    deviceId: getDeviceId(),
    recordedAt: now,
    ...(kind === 'time-in'
      ? { timeIn: now }
      : { timeIn: existing?.timeIn ?? now, timeOut: now }),
  }
  await enqueue(queued)

  const optimistic: AttendanceRecord = {
    id: existing?.id ?? `local-${participant.id}`,
    eventId: eventId.value,
    participantId: participant.id,
    status: 'Present',
    timeIn: kind === 'time-in' ? now : (queued.timeIn ?? now),
    timeOut: kind === 'time-out' ? now : null,
    clientRecordId,
    syncedAt: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    participant: {
      id: participant.id,
      externalName: participant.externalName,
      participantType: participant.participantType,
      user: participant.user,
    },
  }
  const idx = attendance.value.findIndex((row) => row.participantId === participant.id)
  if (idx >= 0) attendance.value[idx] = optimistic
  else attendance.value.push(optimistic)

  notice.value = `${participantDisplayName(participant)} queued offline — will sync when online.`
  await refreshPendingCount()
}

async function onSyncNow(): Promise<void> {
  if (!online.value) {
    error.value = 'You are offline. Reconnect to sync pending attendance.'
    return
  }
  flushing.value = true
  error.value = null
  notice.value = null
  try {
    // Snapshot names before flush clears pending state.
    const beforeFlush = await listPendingRecords()
    const nameById = new Map(
      beforeFlush.map((record) => [record.clientRecordId, record.participantName]),
    )

    const result = await syncClient.flush()

    if (result.sent === 0) {
      notice.value = 'Nothing pending to sync.'
    } else if (result.rejected.length) {
      error.value = `${result.rejected.length} record(s) rejected during sync.`
    } else {
      notice.value = `Synced ${result.accepted.length} record(s).`
    }

    rejected.value = result.rejected.map((rejection) => ({
      key: rejection.clientRecordId,
      name: nameById.get(rejection.clientRecordId) ?? rejection.clientRecordId,
      reason: rejection.reason,
    }))

    await refreshPendingCount()

    if (rejected.value.length === 0) {
      const [freshEvent, freshRoster, freshAttendance] = await Promise.all([
        getEvent(eventId.value),
        listParticipants(eventId.value),
        listAttendance(eventId.value),
      ])
      event.value = freshEvent
      participants.value = freshRoster
      attendance.value = freshAttendance
      fromCache.value = false
      await saveRosterSnapshot({
        eventId: eventId.value,
        participants: freshRoster,
        attendance: freshAttendance,
        cachedAt: new Date().toISOString(),
      })
    } else {
      await refreshRejected()
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Sync failed — records remain queued')
    await refreshPendingCount()
    await refreshRejected()
  } finally {
    flushing.value = false
  }
}

async function refreshRosterFromServer(): Promise<void> {
  const [eventRecord, roster, existingAttendance] = await Promise.all([
    getEvent(eventId.value),
    listParticipants(eventId.value),
    listAttendance(eventId.value),
  ])
  event.value = eventRecord
  participants.value = roster
  attendance.value = existingAttendance
  fromCache.value = false
  await saveRosterSnapshot({
    eventId: eventId.value,
    participants: roster,
    attendance: existingAttendance,
    cachedAt: new Date().toISOString(),
  })
}

async function loadFromCache(fallbackNotice: string): Promise<void> {
  const snapshot = await loadRosterSnapshot(eventId.value)
  if (!snapshot) {
    error.value = 'No cached roster available. Connect once online to load attendance.'
    return
  }
  participants.value = snapshot.participants
  attendance.value = snapshot.attendance
  fromCache.value = true
  notice.value = fallbackNotice
  try {
    event.value = await getEvent(eventId.value)
  } catch {
    // Event header is optional offline — roster is the critical cache.
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  notice.value = null
  fromCache.value = false
  try {
    if (online.value) {
      try {
        await refreshRosterFromServer()
      } catch (err) {
        if (!isNetworkError(err)) throw err
        await loadFromCache('Network unavailable — showing last cached roster.')
      }
    } else {
      await loadFromCache('Offline — showing last cached roster.')
    }
    await refreshPendingCount()
    await refreshRejected()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load attendance'
  } finally {
    loading.value = false
  }
}

watch(online, (isOnline) => {
  if (isOnline && pendingCount.value > 0) {
    void onSyncNow()
  }
})

onMounted(load)
</script>

<template>
  <main class="capture" data-testid="attendance-capture">
    <div class="capture__header">
      <div class="capture__title">
        <h1>Attendance capture</h1>
        <RouterLink
          :to="{ name: 'event-detail', params: { id: eventId } }"
          data-testid="back-to-event"
        >
          ← Back to event
        </RouterLink>
      </div>
      <OfflineBadge :online="online" :pending="pendingCount" />
    </div>

    <p
      v-if="!online"
      class="capture__offline-banner"
      role="status"
      data-testid="offline-banner"
    >
      You are offline. Taps are queued locally and will sync when you reconnect.
    </p>

    <p v-if="loading">Loading…</p>
    <p
      v-else-if="error"
      class="capture__error"
      role="alert"
      data-testid="capture-error"
    >
      {{ error }}
    </p>

    <template v-else>
      <p
        v-if="notice"
        class="capture__notice"
        role="status"
        data-testid="capture-notice"
      >
        {{ notice }}
      </p>

      <div class="capture__toolbar">
        <Card v-if="event" class="capture__event">
          <strong>{{ event.title }}</strong>
          <StatusBadge :status="event.status" />
          <span v-if="fromCache" class="capture__cached" data-testid="roster-cached">
            (cached roster)
          </span>
        </Card>
        <Button
          :label="flushing ? 'Syncing…' : `Sync now${pendingCount ? ` (${pendingCount})` : ''}`"
          data-testid="sync-now"
          :disabled="flushing || !online || pendingCount === 0"
          @click="onSyncNow"
        />
      </div>

      <Card title="Roster">
        <div class="capture__roster-toolbar">
          <input
            v-model="rosterSearch"
            type="text"
            placeholder="Search participant by name or ID…"
            class="capture__search-input"
            data-testid="roster-search-input"
          />
          <div class="capture__filter-tabs">
            <button
              type="button"
              class="capture__tab"
              :class="{ 'capture__tab--active': statusFilter === 'All' }"
              @click="statusFilter = 'All'"
            >
              All ({{ rows.length }})
            </button>
            <button
              type="button"
              class="capture__tab"
              :class="{ 'capture__tab--active': statusFilter === 'Pending Time-In' }"
              @click="statusFilter = 'Pending Time-In'"
            >
              Pending Time-In
            </button>
            <button
              type="button"
              class="capture__tab"
              :class="{ 'capture__tab--active': statusFilter === 'Present' }"
              @click="statusFilter = 'Present'"
            >
              Present
            </button>
          </div>
        </div>

        <p v-if="!rows.length" data-testid="roster-empty">
          No participants registered for this event.
        </p>
        <p v-else-if="!filteredRows.length" class="capture__no-matches">
          No participants match the search or filter.
        </p>
        <ul v-else class="capture__roster" data-testid="roster-list">
          <li
            v-for="row in filteredRows"
            :key="row.participant.id"
            class="capture__row"
            :data-testid="`roster-row-${row.participant.id}`"
          >
            <span class="capture__name">
              {{ participantDisplayName(row.participant) }}
            </span>
            <span class="capture__times">
              <template v-if="row.record">
                In: {{ displayTime(row.record.timeIn) }} ·
                Out: {{ displayTime(row.record.timeOut) }}
              </template>
              <template v-else>Not recorded</template>
            </span>
            <span v-if="row.record" class="capture__status">
              <StatusBadge :status="row.record.status" />
            </span>
            <span class="capture__actions">
              <Button
                label="Time in"
                severity="secondary"
                :data-testid="`time-in-${row.participant.id}`"
                :disabled="!row.canTimeIn"
                @click="recordLocal(row.participant, 'time-in')"
              />
              <Button
                label="Time out"
                severity="secondary"
                :data-testid="`time-out-${row.participant.id}`"
                :disabled="!row.canTimeOut"
                @click="recordLocal(row.participant, 'time-out')"
              />
            </span>
          </li>
        </ul>
      </Card>

      <Card v-if="rejected.length" title="Rejected records">
        <ul class="capture__rejected" data-testid="rejected-list">
          <li
            v-for="item in rejected"
            :key="item.key"
            :data-testid="`rejected-${item.key}`"
          >
            <strong>{{ item.name }}</strong> — {{ item.reason }}
          </li>
        </ul>
      </Card>
    </template>
  </main>
</template>

<style scoped>
.capture {
  padding: 1.5rem;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.capture__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.capture__title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.capture__title h1 {
  margin: 0;
  font-size: 1.35rem;
}
.capture__title a {
  color: var(--accent-text);
  font-size: 0.9em;
}
.capture__offline-banner {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: var(--danger-soft);
  border: 1px solid var(--danger-line);
  color: var(--danger-strong);
  border-radius: 6px;
  font-size: 0.9em;
}
.capture__error {
  color: var(--danger-text);
  margin: 0;
}
.capture__notice {
  margin: 0;
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.capture__toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.capture__event {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.capture__cached {
  color: var(--warn-text);
  font-size: 0.85em;
  font-style: italic;
}
.capture__roster-toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.capture__search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--rose-line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
}
.capture__filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.capture__tab {
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--rose-line);
  background: var(--surface);
  color: var(--muted-plum);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.capture__tab:hover {
  background: var(--rose-soft);
  color: var(--brand-text);
}
.capture__tab--active {
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  border-color: transparent;
}
.capture__no-matches {
  margin: 1rem 0;
  color: var(--muted-plum);
  font-size: 0.9em;
  text-align: center;
}
.capture__roster {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.capture__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
}
.capture__row:last-child {
  border-bottom: none;
}
.capture__name {
  flex: 1 1 12rem;
  font-weight: 500;
  color: var(--text-strong);
}
.capture__times {
  flex: 1 1 12rem;
  color: var(--muted);
  font-size: 0.9em;
}
.capture__actions {
  display: flex;
  gap: 0.5rem;
}
.capture__rejected {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--danger-strong);
  font-size: 0.9em;
}
</style>
