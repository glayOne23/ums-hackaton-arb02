import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DiscountList } from '@/features/product/components/DiscountList'
import type { DiscountFilters, DiscountStatusFilter } from '@/features/product/types'

const STATUSES: DiscountStatusFilter[] = ['pending', 'active', 'inactive', 'rejected', 'all']

/** Filters live in the URL, so the back button and shared links keep them. */
function parseFilters(search: Record<string, unknown>): DiscountFilters {
  const id = (key: string) => (typeof search[key] === 'string' && search[key] !== '' ? (search[key] as string) : undefined)
  return {
    status: STATUSES.find((status) => status === search.status),
    outlet_id: id('outlet_id'),
    product_id: id('product_id'),
    outlet_type_id: id('outlet_type_id'),
  }
}

export const Route = createFileRoute('/office/discounts/')({
  validateSearch: parseFilters,
  component: DiscountsPage,
})

function DiscountsPage() {
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="product.view">
      <DiscountList filters={filters} onFiltersChange={(next) => navigate({ search: next, replace: true })} />
    </PermissionGate>
  )
}
