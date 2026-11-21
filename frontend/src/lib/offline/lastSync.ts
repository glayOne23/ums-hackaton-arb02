import type { QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * PW-07: when the last data came from the server, so screens without a
 * signal can say "data per jam 14.05". Kept on the device with the cache.
 */
const KEY = 'sigap-last-sync'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Remember the time of every successful fetch (called once at start). */
export function trackLastSync(queryClient: QueryClient): () => void {
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'success' && !event.action.manual) {
      try {
        localStorage.setItem(KEY, new Date(event.query.state.dataUpdatedAt).toISOString())
      } catch {
        // Storage blocked: the notice just shows no time
      }
      listeners.forEach((l) => l())
    }
  })
}

export function forgetLastSync(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l())
}

export function useLastSync(): Date | null {
  const value = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    read,
    () => null,
  )
  return value ? new Date(value) : null
}
