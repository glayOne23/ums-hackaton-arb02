import { useSyncExternalStore } from 'react'

function berlangganan(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

/** true bila perangkat sedang tersambung ke jaringan (UX-11). */
export function useSinyal(): boolean {
  return useSyncExternalStore(berlangganan, () => navigator.onLine, () => true)
}
