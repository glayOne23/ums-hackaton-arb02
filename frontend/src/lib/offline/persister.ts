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

/** Data kept on the phone for working without a signal (PW-05). Stays 24 hours. */
export const PERSIST_MAX_AGE = 24 * 60 * 60_000

/** Only field data is kept: queries whose key starts with "offline". */
export function shouldPersistQuery(query: Query): boolean {
  return query.queryKey[0] === 'offline' && query.state.status === 'success'
}
