import type { CustomFieldValues } from '@/features/setting/types'

/** Shapes returned by the Outlet API (backend: App\Modules\Outlet\Http\Resources). */

export type SaleModeValue = 'consignment' | 'cash' | 'credit'

export interface Reference {
  id: string
  name: string
  is_active: boolean
}

export interface SalesRef {
  id: number
  name: string
}

export interface Assignment {
  id: string
  sales: SalesRef
  start_date: string
  end_date: string | null
  is_active: boolean
  reason: string | null
}

export interface Outlet {
  id: string
  /** FP-06: the admin's extra fields */
  custom_fields?: CustomFieldValues
  code: string
  name: string
  outlet_type?: Reference
  region?: Reference
  district: string
  address: string | null
  whatsapp_number: string | null
  sale_mode: { value: SaleModeValue; label: string }
  visit_cycle_days: number | null
  is_active: boolean
  sales?: SalesRef[]
  assignments?: Assignment[]
  created_at: string
  updated_at: string
  /** Filled only for outlets in the trash (status=deleted) */
  deleted_at: string | null
  deleted_by?: SalesRef | null
}

export interface Assignee {
  id: number
  name: string
  username: string
}

/** Laravel paginated resource collection */
export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

/** "deleted" = the trash; only for users with outlet.manage */
export type OutletStatusFilter = 'active' | 'inactive' | 'all' | 'deleted'

export interface OutletFilters {
  search?: string
  region_id?: string
  outlet_type_id?: string
  sale_mode?: SaleModeValue
  status?: OutletStatusFilter
  page?: number
}

/** Labels match App\Modules\Outlet\Enums\SaleMode::label() */
export const SALE_MODES: { value: SaleModeValue; label: string }[] = [
  { value: 'consignment', label: 'Titip jual' },
  { value: 'cash', label: 'Beli langsung' },
  { value: 'credit', label: 'Tempo' },
]

/** OT-03 / W2: what the profile shows besides the outlet data (GET /outlets/{id}/overview). */
export interface OutletOverview {
  last_visit_at: string | null
  visit_cycle_days: number
  next_visit_due: string | null
  visit_overdue: boolean
  stock: {
    product: { id: string; code: string; name: string; unit: string }
    qty: number
    nearest_expiry: string | null
    near_expiry_qty: number
    /** OT-07 stok standar; null = none */
    target_qty: number | null
    sold_3_months: number
  }[]
  stock_total: number
  visits: {
    id: string
    number: string
    type: { value: string; label: string }
    status: { value: 'active' | 'corrected' | 'void'; label: string }
    transacted_at: string
    sales: string
    sold_qty: number
    total: number
    needs_review: boolean
  }[]
  invoices: { id: string; number: string; invoice_date: string; due_date: string; owed: number; overdue: boolean }[]
  owed_total: number
}

/** OT-05: an outlet proposed by a sales from the field. */
export interface OutletProposal {
  id: string
  code: string
  name: string
  outlet_type: string | null
  region: string | null
  district: string
  address: string | null
  whatsapp_number: string | null
  sale_mode: { value: SaleModeValue; label: string }
  status: 'pending' | 'approved' | 'rejected'
  note: string | null
  proposed_by: string | null
  created_at: string
  decided_at: string | null
  decision_note: string | null
  similar: { id: string; code: string; name: string }[]
}
