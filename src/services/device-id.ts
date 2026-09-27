const DEVICE_ID_KEY = 'hems-device-id'

let cachedDeviceId: string | null = null

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = randomId()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    cachedDeviceId = id
  } catch {
    cachedDeviceId = randomId()
  }
  return cachedDeviceId
}

export function newClientRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return randomId()
}
