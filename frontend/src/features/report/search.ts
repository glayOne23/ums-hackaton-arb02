import { currentMonth } from './api'
import type { ReportFilters } from './types'

/** Report filters kept in the URL, so a filtered report can be shared or reopened. */
export interface ReportSearch {
  month?: string
  sales_user_id?: number
  region_id?: string
  outlet_type_id?: string
}

export function validateReportSearch(search: Record<string, unknown>): ReportSearch {
  const id = (value: unknown) => (typeof value === 'string' && /^[0-9a-z]{26}$/i.test(value) ? value : undefined)
  const sales = Number(search.sales_user_id)
  return {
    month: typeof search.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month) ? search.month : undefined,
    sales_user_id: Number.isInteger(sales) && sales > 0 ? sales : undefined,
    region_id: id(search.region_id),
    outlet_type_id: id(search.outlet_type_id),
  }
}

export function toFilters(search: ReportSearch): ReportFilters {
  return { ...search, month: search.month ?? currentMonth() }
}

/** Filters back to the URL; this month is left out so the default link stays short. */
export function toSearch(filters: ReportFilters): ReportSearch {
  return {
    month: filters.month === currentMonth() ? undefined : filters.month,
    sales_user_id: filters.sales_user_id || undefined,
    region_id: filters.region_id || undefined,
    outlet_type_id: filters.outlet_type_id || undefined,
  }
}
