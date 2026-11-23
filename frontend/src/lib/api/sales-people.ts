import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface SalesPerson {
  id: number
  name: string
  phone: string | null
  is_active: boolean
}

/** Sales staff for office filters (backend: GET /sales-people), active first. */
export function useSalesPeople(enabled = true) {
  return useQuery({
    queryKey: ['sales-people'],
    queryFn: ({ signal }) => api<{ data: SalesPerson[] }>('/sales-people', { signal }).then((r) => r.data),
    staleTime: 10 * 60_000,
    enabled,
  })
}
