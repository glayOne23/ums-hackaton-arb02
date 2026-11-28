/** Shapes of the Sales API (backend: App\Modules\Sales). */

import type { CorrectionSummary } from '@/features/correction/types'
import type { ExpiryMonth } from '@/lib/expiry'

export type SaleModeValue = 'consignment' | 'cash' | 'credit'
export type TransactionTypeValue = 'consignment_visit' | 'direct_sale'
export type PaymentMethodValue = 'cash' | 'transfer'

export interface ProductStock {
  product_id: string
  qty: number
  near_expiry_qty: number
  nearest_expiry: string
  /** Doc 11: the same pieces per expiry month, oldest first */
  expiry?: ExpiryMonth[]
}

/** Doc 11: the visit asks for an ED count; product_ids null = every product on the shelf */
export interface ExpiryCheckRequest {
  trigger: string
  label: string
  product_ids: string[] | null
}

export interface OutletPrice {
  selling_price: number
  discount_percent: number
  /** After discount */
  price: number
}

export interface PackageOutlet {
  id: string
  code: string
  name: string
  outlet_type: string | null
  region: string | null
  district: string
  address: string | null
  whatsapp_number: string | null
  sale_mode: { value: SaleModeValue; label: string }
  visit_cycle_days: number
  last_visit_at: string | null
  unpaid: number
  stock: ProductStock[]
  /** Optional stok standar per product (OT-07); missing = none */
  stock_targets?: Record<string, number>
  prices: Record<string, OutletPrice>
  expiry_check?: ExpiryCheckRequest | null
}

export interface PackageSettings {
  billing_threshold: number
  billing_threshold_unit: 'unit' | 'product'
  expiry_withdrawal_months: number
  visit_cycle_days: number
  credit_term_days: number
  form_photo_required: boolean
  /** Send form photos over Wi-Fi only (NF-02) */
  data_saver: boolean
  /** Printed on the nota (PG-09) */
  company_name: string
  company_address: string
  company_whatsapp: string
  /** PG-09: small data URL, '' when none */
  company_logo?: string
}

/** Everything the phone needs for a day in the field (GET /sales/work-package). */
export interface WorkPackage {
  generated_at: string
  today: { date: string; visited_outlet_ids: string[]; cash: number; transfer: number }
  settings: PackageSettings
  products: { id: string; code: string; name: string; unit: string }[]
  carried: ProductStock[]
  outlets: PackageOutlet[]
}

export interface TransactionItemInput {
  product_id: string
  opening_qty?: number
  remaining_qty?: number
  withdrawn_qty?: number
  refill_qty?: number
  sold_qty?: number
  /** Doc 11: the shelf counted per expiry month */
  remaining_by_expiry?: ExpiryMonth[]
  /** Doc 11: the month the refill was taken from, when the sales chose it */
  refill_expiry_month?: string
}

/** What the phone sends (POST /sales/transactions). */
export interface TransactionInput {
  client_uuid: string
  type: TransactionTypeValue
  outlet_id: string
  transacted_at: string
  items: TransactionItemInput[]
  payment: { amount: number; method: PaymentMethodValue }
  expiry_check?: { trigger: string }
}

export interface TransactionItem {
  id: string
  product_id: string
  product_name: string
  opening_qty: number | null
  remaining_qty: number | null
  sold_qty: number
  withdrawn_qty: number
  refill_qty: number
  closing_qty: number | null
  unit_price: number
  discount_percent: number
  line_total: number
}

/** A saved nota (TransactionResource). */
export interface Transaction {
  id: string
  client_uuid: string
  number: string
  type: { value: TransactionTypeValue; label: string }
  status: { value: 'active' | 'corrected' | 'void'; label: string }
  outlet?: { id: string; code: string; name: string; whatsapp_number: string | null }
  sales?: { id: number; name: string }
  transacted_at: string
  subtotal: number
  discount_total: number
  total: number
  sold_qty?: number
  needs_review: boolean
  review_notes: string[]
  has_photo: boolean
  items?: TransactionItem[]
  invoice?: {
    number: string
    amount: number
    paid_amount: number
    due_date: string
    status: { value: 'unpaid' | 'partial' | 'paid' | 'void'; label: string }
  } | null
  paid_now?: number
  created_at: string
  /** The nota this one replaces / the one that replaced it (KR-03) */
  corrects?: { id: string; number: string } | null
  replaced_by?: { id: string; number: string } | null
  voided?: { by: string | null; at: string; reason: string | null } | null
  reviewed?: { by: string | null; at: string } | null
  /** What the phone sent, on a "Perlu dicek" nota (office only) */
  client_items?: TransactionItemInput[]
  /** Which correction buttons this user gets (detail only) */
  correction?: CorrectionSummary | null
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}
