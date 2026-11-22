/** Shapes returned by the Product API (backend: App\Modules\Product\Http). */

export interface Ref {
  id: string
  name: string
}

export interface UserRef {
  id: number
  name: string
}

export interface Category extends Ref {
  is_active: boolean
}

export interface Product {
  id: string
  code: string
  name: string
  category?: Ref
  bpom_number: string | null
  unit: string
  selling_price: number
  min_stock_qty: number
  is_active: boolean
  /** PR-01: optional photo, fetched from /products/{id}/photo */
  has_photo: boolean
  photo_version: number | null
  aliases?: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by?: UserRef | null
}

export type DiscountStatusValue = 'pending' | 'active' | 'inactive' | 'rejected'

export interface Discount {
  id: string
  outlet_type: Ref | null
  product: (Ref & { code: string }) | null
  outlet: Ref | null
  scope_label: string
  discount_percent: number
  valid_from: string
  status: { value: DiscountStatusValue; label: string }
  created_by: UserRef | null
  decided_by: UserRef | null
  decided_at: string | null
  decision_note: string | null
  created_at: string
}

export interface PriceListItem {
  product: { id: string; code: string; name: string; unit: string; category: string }
  selling_price: number
  discount_percent: number
  net_price: number
  discount_id: string | null
}

export interface PriceList {
  outlet_type: Ref
  date: string
  data: PriceListItem[]
}

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

export type ProductStatusFilter = 'active' | 'inactive' | 'all' | 'deleted'

export interface ProductFilters {
  search?: string
  category_id?: string
  status?: ProductStatusFilter
  page?: number
}

export type DiscountStatusFilter = 'current' | DiscountStatusValue | 'all'
