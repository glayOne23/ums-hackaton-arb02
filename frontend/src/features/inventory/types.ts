/** Shapes returned by the Inventory API (backend: App\Modules\Inventory). */

export interface ValueLabel<T extends string = string> {
  value: T
  label: string
}

export interface ProductRef {
  id: string
  code: string
  name: string
  unit?: string
}

export interface StockBatch {
  id: string
  batch_number: string
  expiry_date: string
  qty: number
  near_expiry: boolean
}

export interface ProductStock {
  product: ProductRef & { unit: string; category: string | null; min_stock_qty: number }
  qty: number
  nearest_expiry: string | null
  below_minimum: boolean
  near_expiry_qty: number
  /** null for sales (they never see batches) */
  batches: StockBatch[] | null
}

export interface WarehouseStock {
  expiry_warning_date: string
  alerts: { below_minimum: number; near_expiry_qty: number }
  data: ProductStock[]
}

export interface SalesStock {
  sales: { id: number; name: string }
  data: ProductStock[]
}

export interface StockCardRow {
  id: string
  at: string
  type: ValueLabel
  document: string | null
  batch_number: string
  expiry_date: string
  counterpart: string | null
  in: number
  out: number
  balance: number
  note: string | null
  by: string | null
}

export interface StockCard {
  product: ProductRef & { unit: string }
  from: string
  to: string
  opening: number
  closing: number
  data: StockCardRow[]
}

export interface GoodsReceipt {
  id: string
  number: string
  received_date: string
  note: string | null
  created_by: string | null
  status: 'active' | 'void'
  voided: { by: string | null; at: string; reason: string | null } | null
  total_qty: number
  items: { product: ProductRef; batch_number: string; expiry_date: string; qty: number }[]
  created_at: string
}

export type StockRequestStatusValue = 'submitted' | 'prepared' | 'issued' | 'rejected'

export interface StockRequestItem {
  id: string
  product: ProductRef & { unit: string }
  requested_qty: number
  issued_qty: number | null
  allocations: { batch_id: string; batch_number: string | null; expiry_date: string | null; qty: number }[] | null
}

export interface StockRequest {
  id: string
  number: string
  status: ValueLabel<StockRequestStatusValue>
  sales: { id: number; name: string }
  note: string | null
  warehouse_note: string | null
  prepared_by: string | null
  prepared_at: string | null
  issued_by: string | null
  issued_at: string | null
  created_at: string
  items: StockRequestItem[]
}

export type ReturnConditionValue = 'sellable' | 'damaged' | 'expired'

export interface StockReturn {
  id: string
  number: string
  sales: { id: number; name: string }
  received_date: string
  note: string | null
  created_by: string | null
  items: {
    product: ProductRef
    batch_number: string
    expiry_date: string
    qty: number
    condition: ValueLabel<ReturnConditionValue>
  }[]
  created_at: string
}

export interface StockAdjustment {
  id: string
  number: string
  counted_date: string
  reason: string
  status: ValueLabel<'pending' | 'applied' | 'rejected' | 'reopened'>
  created_by: string | null
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  /** KR-13: opened again the same day */
  reopened: { by: string | null; at: string; reason: string | null } | null
  can_reopen: boolean
  items: {
    batch_id: string
    product: ProductRef
    batch_number: string
    expiry_date: string
    system_qty: number
    physical_qty: number
    difference_qty: number
  }[]
  created_at: string
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export interface UserOption {
  id: number
  name: string
  username: string
}

/** Labels match App\Modules\Inventory\Enums\ReturnCondition::label() */
export const RETURN_CONDITIONS: { value: ReturnConditionValue; label: string; hint: string }[] = [
  { value: 'sellable', label: 'Baik', hint: 'Kembali ke stok gudang' },
  { value: 'damaged', label: 'Rusak', hint: 'Ke retur untuk rework' },
  { value: 'expired', label: 'Kedaluwarsa', hint: 'Dimusnahkan' },
]
