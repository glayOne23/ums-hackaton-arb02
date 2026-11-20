import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { OutletList } from '@/features/outlet/components/OutletList'
import type { OutletFilters, OutletStatusFilter, SaleModeValue } from '@/features/outlet/types'

const SALE_MODES: SaleModeValue[] = ['consignment', 'cash', 'credit']
const STATUSES: OutletStatusFilter[] = ['inactive', 'all', 'deleted']

/** Filters live in the URL, so the back button and shared links keep them. */
function parseFilters(search: Record<string, unknown>): OutletFilters {
  const text = (key: string) =>
    typeof search[key] === 'string' && search[key] !== '' ? (search[key] as string) : undefined
  const page = Number(search.page)

  return {
    search: text('search'),
    region_id: text('region_id'),
    outlet_type_id: text('outlet_type_id'),
    sale_mode: SALE_MODES.find((mode) => mode === search.sale_mode),
    status: STATUSES.find((status) => status === search.status),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export const Route = createFileRoute('/office/outlets/')({
  validateSearch: parseFilters,
  component: OutletsPage,
})

function OutletsPage() {
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const onFiltersChange = useCallback((next: OutletFilters) => navigate({ search: next, replace: true }), [navigate])

  return (
    <PermissionGate permission="outlet.view">
      <OutletList filters={filters} onFiltersChange={onFiltersChange} />
    </PermissionGate>
  )
}
