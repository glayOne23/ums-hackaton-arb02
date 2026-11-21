import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { Query } from '@tanstack/react-query'
import Dexie, { type EntityTable } from 'dexie'

interface KeyValue {
  key: string
  value: string
}

/** IndexedDB, not localStorage: the sales work package can reach a few hundred KB (SDD §5). */
const db = new Dexie('sigap-cache') as Dexie & { kv: EntityTable<KeyValue, 'key'> }
db.version(1).stores({ kv: 'key' })

export const queryPersister = createAsyncStoragePersister({
  storage: {
    getItem: async (key) => (await db.kv.get(key))?.value ?? null,
    setItem: async (key, value) => {
      await db.kv.put({ key, value })
    },
    removeItem: async (key) => {
      await db.kv.delete(key)
    },
  },
  key: 'sigap-query-cache',
})

/** Data kept on the device for working without a signal (PW-05, PW-07). Stays 24 hours. */
export const PERSIST_MAX_AGE = 24 * 60 * 60_000

/**
 * Parts of a key that are never kept: previews computed for one action, and
 * photos (object URLs that are gone once the app closes).
 */
const NOT_KEPT = ['preview', 'photo', 'merge']

/**
 * What is kept on the device: the sales' field data (PW-05), and what every
 * other role last opened (PW-07, read-only without a signal). Cleared when
 * signing out, so the next person on the device never sees it.
 */
export function shouldPersistQuery(query: Query): boolean {
  return (
    query.state.status === 'success' &&
    !query.queryKey.some((part) => typeof part === 'string' && NOT_KEPT.some((word) => part.includes(word)))
  )
}
