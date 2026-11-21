import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlobUrl } from '@/lib/api/client'
import type {
  ManagerSummary,
  ReportCatalogGroup,
  ReportFilters,
  ReportOptions,
  ReportResult,
  SalesTargetRow,
} from './types'

export const reportKeys = {
  all: ['reports'] as const,
  catalog: ['reports', 'catalog'] as const,
  options: ['reports', 'options'] as const,
  summary: (filters: ReportFilters) => ['reports', 'summary', filters] as const,
  report: (code: string, filters: ReportFilters) => ['reports', code, filters] as const,
  targets: (month: string) => ['reports', 'targets', month] as const,
}

/** This month as "2026-11", in the device's time zone. */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function filterQuery(filters: ReportFilters): string {
  const params = new URLSearchParams({ month: filters.month })
  if (filters.sales_user_id) params.set('sales_user_id', String(filters.sales_user_id))
  if (filters.region_id) params.set('region_id', filters.region_id)
  if (filters.outlet_type_id) params.set('outlet_type_id', filters.outlet_type_id)
  return params.toString()
}

export function useReportCatalog() {
  return useQuery({
    queryKey: reportKeys.catalog,
    queryFn: ({ signal }) => api<{ data: ReportCatalogGroup[] }>('/reports', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
  })
}

export function useReportOptions() {
  return useQuery({
    queryKey: reportKeys.options,
    queryFn: ({ signal }) => api<ReportOptions>('/reports/options', { signal }),
    staleTime: 10 * 60_000,
  })
}

export function useManagerSummary(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.summary(filters),
    queryFn: ({ signal }) =>
      api<{ data: ManagerSummary }>(`/reports/summary?${filterQuery(filters)}`, { signal }).then((r) => r.data),
    placeholderData: (previous) => previous,
  })
}

export function useReport(code: string, filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.report(code, filters),
    queryFn: ({ signal }) => api<ReportResult>(`/reports/${code}?${filterQuery(filters)}`, { signal }),
    placeholderData: (previous) => previous,
  })
}

/** Download the report as an .xlsx file (the server builds it; numbers stay numbers). */
export async function downloadReportExcel(code: string, filters: ReportFilters, fileName: string): Promise<void> {
  const url = await apiBlobUrl(`/reports/${code}?${filterQuery(filters)}&format=xlsx`)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function useSalesTargets(month: string, enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.targets(month),
    queryFn: ({ signal }) =>
      api<{ data: SalesTargetRow[] }>(`/sales/targets?month=${month}`, { signal }).then((r) => r.data),
    enabled,
  })
}

export function useSaveSalesTargets() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { month: string; targets: Omit<SalesTargetRow, 'name'>[] }) =>
      api<{ data: SalesTargetRow[]; changed: number }>('/sales/targets', { method: 'PUT', body }),
    // Summary and performance show the targets too
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  })
}
