import Dexie, { type EntityTable } from 'dexie'
import type { Transaction, TransactionInput } from '../types'

export type ReceiptStatus = 'queued' | 'failed' | 'sent'

export interface ReceiptLine {
  productId: string
  name: string
  sold: number
  withdrawn: number
  refill: number
  /** Stock left at the outlet; null for a direct sale */
  closing: number | null
  price: number
  total: number
}

/**
 * A visit or sale saved on the phone (KS-11, NF-01). It stays here until the
 * server has it, then remains as today's history for the nota screen.
 */
export interface Receipt {
  client_uuid: string
  user_id: number
  input: TransactionInput
  outlet: { id: string; name: string; whatsapp_number: string | null; sale_mode: string }
  lines: ReceiptLine[]
  total: number
  previous_unpaid: number
  paid: number
  status: ReceiptStatus
  /** Why the server refused it, in plain words (KR-12) */
  error: string | null
  transaction: Transaction | null
  photo: Blob | null
  photo_status: 'none' | 'queued' | 'sent'
  created_at: string
  sent_at: string | null
}

export const salesDb = new Dexie('sigap-sales') as Dexie & { receipts: EntityTable<Receipt, 'client_uuid'> }
salesDb.version(1).stores({ receipts: 'client_uuid, user_id, status, created_at' })

/** Notas older than this are removed once sent (the server keeps them). */
const KEEP_DAYS = 7

export async function pruneSentReceipts(now: Date = new Date()): Promise<void> {
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString()
  await salesDb.receipts
    .where('status')
    .equals('sent')
    .filter((r) => r.created_at < cutoff && r.photo_status !== 'queued')
    .delete()
}
