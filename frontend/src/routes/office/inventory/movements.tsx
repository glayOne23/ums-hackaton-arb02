import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { StockMovementsView } from '@/features/inventory/components/StockMovementsView'
import type { MovementFilters, MovementPlace } from '@/features/inventory/types'

const PLACES: MovementPlace[] = ['warehouse', 'outlet', 'sales']
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Filters live in the URL, so a link from the outlet profile opens the right shelf. */
function parseFilters(search: Record<string, unknown>): MovementFilters {
  const text = (key: string) =>
    typeof search[key] === 'string' && search[key] !== '' ? (search[key] as string) : undefined
  const page = Number(search.page)
  const sales = Number(search.sales_user_id)
  const from = text('from')
  const to = text('to')

  return {
    place: PLACES.find((p) => p === search.place) ?? 'warehouse',
    outlet_id: text('outlet_id'),
    sales_user_id: Number.isInteger(sales) && sales > 0 ? sales : undefined,
    product_id: text('product_id'),
    type: text('type'),
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export const Route = createFileRoute('/office/inventory/movements')({
  validateSearch: parseFilters,
  component: MovementsPage,
})

function MovementsPage() {
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const onFiltersChange = useCallback((next: MovementFilters) => navigate({ search: next, replace: true }), [navigate])

  return (
    <PermissionGate permission={['inventory.view', 'stock_request.view', 'outlet.view_all']}>
      <StockMovementsView filters={filters} onFiltersChange={onFiltersChange} />
    </PermissionGate>
  )
}
