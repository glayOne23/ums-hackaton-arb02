import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { PriceListView } from '@/features/product/components/PriceListView'

interface PriceListSearch {
  outlet_type_id?: string
  date?: string
}

export const Route = createFileRoute('/office/price-list')({
  validateSearch: (search: Record<string, unknown>): PriceListSearch => ({
    outlet_type_id:
      typeof search.outlet_type_id === 'string' && search.outlet_type_id ? search.outlet_type_id : undefined,
    date: typeof search.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.date) ? search.date : undefined,
  }),
  component: PriceListPage,
})

function PriceListPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="product.view">
      <PriceListView
        outletTypeId={search.outlet_type_id ?? ''}
        date={search.date ?? ''}
        onChange={({ outletTypeId, date }) =>
          navigate({ search: { outlet_type_id: outletTypeId || undefined, date: date || undefined }, replace: true })
        }
      />
    </PermissionGate>
  )
}
