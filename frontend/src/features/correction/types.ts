/** Shapes of the correction & recovery API (backend: Sales corrections, Core history/trash). */

export type HistoryType = 'outlet' | 'product' | 'transaction' | 'goods_receipt' | 'stock_request'

/** One line of a record's change history (W12). */
export interface HistoryEntry {
  id: string
  title: string
  changes: string[]
  reason: string | null
  by: string | null
  at: string | null
}

export type CorrectionKindValue = 'correct' | 'void'

/** A correction or void request (W11, W13). */
export interface Correction {
  id: string
  kind: { value: CorrectionKindValue; label: string }
  status: { value: 'pending' | 'applied' | 'rejected'; label: string }
  reason: string
  changes: string[]
  transaction: {
    id: string
    number: string
    outlet: string
    sales: string
    transacted_at: string
    total: number
  }
  requested_by: string
  created_at: string
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  replacement_id: string | null
  may_decide: boolean
}

/** Which buttons the nota screen offers this user (TransactionResource.correction). */
export interface CorrectionSummary {
  may_change: boolean
  /** The creator within the window: fixed at once, no reason needed */
  direct: boolean
  needs_approval: boolean
  blocked: string | null
  /** Last day the creator may still fix directly */
  direct_until: string
  pending: Correction | null
}

export interface CorrectionItemInput {
  product_id: string
  remaining_qty?: number
  withdrawn_qty?: number
  refill_qty?: number
  sold_qty?: number
}

export interface CorrectionInput {
  kind: CorrectionKindValue
  outlet_id?: string | null
  items?: CorrectionItemInput[]
  reason?: string
}

export interface CorrectionPreview {
  lines: string[]
  total_before: number
  total_after: number
}

export interface TrashItem {
  type: 'outlet' | 'product'
  id: string
  code: string
  name: string
  deleted_at: string
  deleted_by: string | null
  /** Removed for good on this day */
  purge_on: string
}

/** A sales' phone that still holds visits (KR-12). */
export interface DeviceSync {
  user: { id: number; name: string }
  queued: number
  failed: number
  last_error: string | null
  oldest_waiting_at: string | null
  reported_at: string
  last_sent_at: string | null
}

/** What merging a duplicate into a kept outlet or product will do (KR-08). */
export interface MergePreview {
  from: { id: string; code: string; name: string }
  moves: string[]
  notes: string[]
  blocked: string | null
}

/** PG-12: a void of a payment or warehouse document waiting for approval */
export interface VoidRequestItem {
  id: string
  type: 'payment' | 'goods_receipt' | 'stock_return'
  type_label: string
  label: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requested_by: string
  requested_at: string
  url: string
}
