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
