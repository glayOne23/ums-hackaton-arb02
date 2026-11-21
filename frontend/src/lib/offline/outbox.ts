import type { QueryClient } from '@tanstack/react-query'
import Dexie, { type EntityTable } from 'dexie'
import { api, ApiError } from '@/lib/api/client'
import { uuid } from '@/lib/uuid'

/**
 * PW-06: warehouse documents (goods in, returns, stock counts) saved on the
 * device when there is no signal, sent in order once it is back. Each has a
 * client_uuid, so a resend after a lost answer never makes a double on the
 * server. A document the server refuses stays here, marked failed with the
 * reason, until it is sent again or dropped (KR-12, as for sales visits).
 */
export type OutboxKind = 'goods_receipt' | 'return' | 'stock_count'

export interface OutboxItem {
  id: string
  user_id: number
  kind: OutboxKind
  /** What it is, for the list: "Barang masuk 3 produk" */
  label: string
  path: string
  body: Record<string, unknown>
  status: 'queued' | 'failed'
  error: string | null
  created_at: string
}

export const outboxDb = new Dexie('sigap-outbox') as Dexie & { items: EntityTable<OutboxItem, 'id'> }
outboxDb.version(1).stores({ items: 'id, user_id, status, created_at' })

export type Sent<T> = { queued: false; data: T } | { queued: true; item: OutboxItem }

/** Send now; without a signal, keep it on the device and say so. */
export async function sendOrQueue<T>(input: {
  userId: number
  kind: OutboxKind
  label: string
  path: string
  body: Record<string, unknown>
}): Promise<Sent<T>> {
  const body = { ...input.body, client_uuid: input.body.client_uuid ?? uuid() }
  if (navigator.onLine) {
    try {
      const { data } = await api<{ data: T }>(input.path, { method: 'POST', body })
      return { queued: false, data }
    } catch (error) {
      if (!(error instanceof ApiError && error.isOffline)) throw error
    }
  }

  const item: OutboxItem = {
    id: String(body.client_uuid),
    user_id: input.userId,
    kind: input.kind,
    label: input.label,
    path: input.path,
    body,
    status: 'queued',
    error: null,
    created_at: new Date().toISOString(),
  }
  await outboxDb.items.put(item)
  return { queued: true, item }
}

let running: Promise<void> | null = null

/** Send what waits, oldest first; stops at the first sign of no signal. */
export function flushOutbox(queryClient: QueryClient, userId: number): Promise<void> {
  running ??= send(queryClient, userId).finally(() => {
    running = null
  })
  return running
}

async function send(queryClient: QueryClient, userId: number): Promise<void> {
  const waiting = (await outboxDb.items.where('user_id').equals(userId).sortBy('created_at')).filter(
    (i) => i.status === 'queued',
  )
  let sent = false
  for (const item of waiting) {
    try {
      await api(item.path, { method: 'POST', body: item.body })
      await outboxDb.items.delete(item.id)
      sent = true
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 401 &&
        error.status !== 429
      ) {
        await outboxDb.items.update(item.id, { status: 'failed', error: error.message })
        continue
      }
      break
    }
  }
  if (sent) await queryClient.invalidateQueries({ queryKey: ['inventory'] })
}

/** "Kirim ulang" for one the server refused (after fixing what it said, e.g. a closed month reopened). */
export async function retryOutboxItem(queryClient: QueryClient, item: OutboxItem): Promise<void> {
  await outboxDb.items.update(item.id, { status: 'queued', error: null })
  await flushOutbox(queryClient, item.user_id)
}

export async function dropOutboxItem(item: OutboxItem): Promise<void> {
  await outboxDb.items.delete(item.id)
}
