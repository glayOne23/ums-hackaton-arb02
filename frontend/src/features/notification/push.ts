import { api } from '@/lib/api/client'

/**
 * PW-08: switch push notifications on or off for this device. Works where
 * the browser supports Web Push and the app's service worker is installed
 * (the built app; on iPhone only once added to the home screen, iOS 16.4+).
 */
export type PushState = 'unsupported' | 'blocked' | 'off' | 'on'

export async function pushState(): Promise<PushState> {
  const registration = await serviceWorker()
  if (!registration || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return (await registration.pushManager.getSubscription()) ? 'on' : 'off'
}

export async function enablePush(): Promise<PushState> {
  const registration = await serviceWorker()
  if (!registration) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const { data } = await api<{ data: { public_key: string | null } }>('/push-subscriptions/key')
  if (!data.public_key) throw new Error('Notifikasi ke perangkat belum disiapkan di server.')

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    }))
  const json = subscription.toJSON()
  await api('/push-subscriptions', {
    method: 'POST',
    body: { endpoint: json.endpoint, keys: json.keys, content_encoding: 'aes128gcm' },
  })
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const registration = await serviceWorker()
  const subscription = await registration?.pushManager.getSubscription()
  if (subscription) {
    await api('/push-subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => {})
    await subscription.unsubscribe()
  }
  return 'off'
}

/** The registered worker, without waiting forever where there is none (development). */
async function serviceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
