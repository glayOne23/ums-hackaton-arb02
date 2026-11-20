import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ProductList } from '@/features/product/components/ProductList'
import type { ProductFilters, ProductStatusFilter } from '@/features/product/types'

const STATUSES: ProductStatusFilter[] = ['inactive', 'all', 'deleted']

/** Filters live in the URL, so the back button and shared links keep them. */
function parseFilters(search: Record<string, unknown>): ProductFilters {
  const text = (key: string) =>
    typeof search[key] === 'string' && search[key] !== '' ? (search[key] as string) : undefined
  const page = Number(search.page)

  return {
    search: text('search'),
    category_id: text('category_id'),
    status: STATUSES.find((status) => status === search.status),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export const Route = createFileRoute('/office/products/')({
  validateSearch: parseFilters,
  component: ProductsPage,
})

function ProductsPage() {
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const onFiltersChange = useCallback((next: ProductFilters) => navigate({ search: next, replace: true }), [navigate])

  return (
    <PermissionGate permission="product.view">
      <ProductList filters={filters} onFiltersChange={onFiltersChange} />
    </PermissionGate>
  )
}
