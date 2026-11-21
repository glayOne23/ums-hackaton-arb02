import { useSyncExternalStore } from 'react'

/** UX-09: which screen tips this person already closed on this device. */
const listeners = new Set<() => void>()
const key = (userId: number) => `sigap-hints-seen:${userId}`

function read(userId: number): string {
  try {
    return localStorage.getItem(key(userId)) ?? '[]'
  } catch {
    return '[]'
  }
}

export function useSeenHints(userId: number): string[] {
  const raw = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => read(userId),
    () => '[]',
  )
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function markHintSeen(userId: number, id: string): void {
  write(userId, [...new Set([...(JSON.parse(read(userId)) as string[]), id])])
}

/** "Tampilkan lagi semua petunjuk". */
export function resetHints(userId: number): void {
  write(userId, [])
}

function write(userId: number, ids: string[]): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(ids))
  } catch {
    // Storage blocked: the tip simply shows again next time
  }
  listeners.forEach((l) => l())
}
