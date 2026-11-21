export type FilterKey = 'month' | 'sales' | 'region' | 'outlet_type'
export type ColumnType = 'text' | 'int' | 'money' | 'percent' | 'date' | 'datetime'
export type CellValue = string | number | boolean | null

export interface ReportFilters {
  month: string
  sales_user_id?: number
  region_id?: string
  outlet_type_id?: string
}

export interface ReportCatalogGroup {
  key: 'analytics' | 'monthly' | 'warehouse'
  title: string
  items: { code: string; title: string; description: string; filters: FilterKey[] }[]
}

export interface ReportOptions {
  sales: { id: number; name: string; is_active: boolean }[]
  regions: { id: string; name: string }[]
  outlet_types: { id: string; name: string }[]
}

export interface ReportResult {
  code: string
  title: string
  description: string
  filters: FilterKey[]
  month_label: string
  as_of: string
  columns: { key: string; label: string; type: ColumnType }[]
  rows: Record<string, CellValue>[]
  totals: Record<string, number> | null
}

export interface SummarySales {
  sales_user_id: number
  name: string
  visits: number
  visit_target: number
  revenue: number
  revenue_target: number
  target_percent: number | null
}

export interface ManagerSummary {
  month: string
  month_label: string
  as_of: string
  kpis: {
    revenue: number
    revenue_previous: number
    revenue_target: number
    visits: number
    visit_target: number
    unvisited_outlets: number
    unpaid_outlets: number
    unpaid_amount: number
  }
  sales: SummarySales[]
  top_outlets: {
    rank: number
    outlet_id: string
    outlet: string
    region: string
    visits: number
    sold: number
    revenue: number
  }[]
  turnover: {
    product_id: string
    product: string
    opening: number
    sold: number
    sell_through: number | null
    slow: boolean
  }[]
  slow_products: number
  actions: {
    expiring_qty: number
    expiring_batches: number
    below_minimum: { product: string; qty: number; minimum: number }[]
    overdue_outlets: number
    unvisited_outlets: number
  }
}

export interface SalesTargetRow {
  sales_user_id: number
  name: string
  visit_target: number
  revenue_target: number
}
