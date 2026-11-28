import type { QueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import type { Transaction } from '../types'
import { type Receipt, salesDb } from './db'

let running: Promise<void> | null = null

/**
 * Send what is waiting on the phone, oldest first (KS-11). Without a signal
 * or with the server down, everything stays queued for the next try. A visit
 * the server refuses (422) is marked failed with the reason, shown with a
 * "Kirim ulang" button (KR-12). The same visit sent twice is answered with
 * the saved copy, never a double. Photos go after the numbers (SDD §5).
 */
export function flushReceipts(queryClient: QueryClient, userId: number): Promise<void> {
  running ??= send(queryClient, userId).finally(() => {
    running = null
  })
  return running
}

async function send(queryClient: QueryClient, userId: number): Promise<void> {
  const waiting = (await salesDb.receipts.where('user_id').equals(userId).sortBy('created_at')).filter(
    (r) => r.status === 'queued' || (r.status === 'sent' && r.photo_status === 'queued'),
  )
  let sent = false

  for (const receipt of waiting) {
    let current: Receipt = receipt
    if (current.status === 'queued') {
      const result = await sendTransaction(current)
      if (result === 'stop') break
      if (result === 'failed') continue
      current = result
      sent = true
    }
    if (current.photo_status === 'queued' && current.photo && current.transaction && photoMayGo(current)) {
      if ((await sendPhoto(current)) === 'stop') break
    }
  }

  if (sent) {
    await queryClient.invalidateQueries({ queryKey: ['offline'] })
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
    await queryClient.invalidateQueries({ queryKey: ['sales'] })
  }

  await reportQueue(userId)
}

const REPORT_EVERY_MS = 10 * 60_000
let lastReport = { key: '', at: 0 }

/**
 * KR-12: tell the office how many visits are still on this phone (waiting or
 * refused), when that changed or every 10 minutes. Without a signal it simply
 * tries again next time.
 */
async function reportQueue(userId: number): Promise<void> {
  const mine = await salesDb.receipts.where('user_id').equals(userId).toArray()
  const queued = mine.filter((r) => r.status === 'queued')
  const failed = mine.filter((r) => r.status === 'failed')
  const body = {
    queued: queued.length,
    failed: failed.length,
    last_error: failed.at(-1)?.error ?? null,
    oldest_waiting_at: [...queued, ...failed].map((r) => r.created_at).sort()[0] ?? null,
  }
  const key = JSON.stringify(body)
  if (key === lastReport.key && Date.now() - lastReport.at < REPORT_EVERY_MS) return

  try {
    await api('/sales/sync-status', { method: 'POST', body })
    lastReport = { key, at: Date.now() }
  } catch {
    // No signal or server down: the next round reports it
  }
}

async function sendTransaction(receipt: Receipt): Promise<Receipt | 'failed' | 'stop'> {
  try {
    const { data } = await api<{ data: Transaction }>('/sales/transactions', { method: 'POST', body: receipt.input })
    // The server's clock, like the work package's generated_at: a package made in the
    // same second already holds this visit, so it must not be applied twice
    const changes = {
      status: 'sent' as const,
      transaction: data,
      error: null,
      sent_at: data.created_at,
    }
    await salesDb.receipts.update(receipt.client_uuid, changes)
    return { ...receipt, ...changes }
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 401 &&
      error.status !== 429
    ) {
      await salesDb.receipts.update(receipt.client_uuid, { status: 'failed', error: error.message })
      return 'failed'
    }
    return 'stop'
  }
}

async function sendPhoto(receipt: Receipt): Promise<'ok' | 'stop'> {
  const form = new FormData()
  form.append('photo', receipt.photo as Blob, `${receipt.client_uuid}.jpg`)
  try {
    await api(`/sales/transactions/${receipt.transaction?.id}/photo`, { method: 'POST', body: form })
    // The server has it now; free the space on the phone
    await salesDb.receipts.update(receipt.client_uuid, { photo_status: 'sent', photo: null })
    return 'ok'
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      await salesDb.receipts.update(receipt.client_uuid, { photo_status: 'none', error: error.message })
      return 'ok'
    }
    return 'stop'
  }
}

/**
 * Hemat data (NF-02): a photo waits until the phone is on Wi-Fi. Chrome on
 * Android tells the connection type; where the browser does not, it is sent.
 */
function photoMayGo(receipt: Receipt): boolean {
  if (!receipt.photo_wifi_only) return true
  const type = (navigator as Navigator & { connection?: { type?: string } }).connection?.type
  return type === undefined || type === 'wifi' || type === 'ethernet'
}

/** "Kirim ulang" for a visit the server refused. */
export async function retryReceipt(queryClient: QueryClient, receipt: Receipt): Promise<void> {
  await salesDb.receipts.update(receipt.client_uuid, { status: 'queued', error: null })
  await flushReceipts(queryClient, receipt.user_id)
}
