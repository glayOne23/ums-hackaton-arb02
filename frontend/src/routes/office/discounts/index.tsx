import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DiscountList } from '@/features/product/components/DiscountList'
import type { DiscountStatusFilter } from '@/features/product/types'

const STATUSES: DiscountStatusFilter[] = ['pending', 'active', 'inactive', 'rejected', 'all']

export const Route = createFileRoute('/office/discounts/')({
  validateSearch: (search: Record<string, unknown>): { status?: DiscountStatusFilter } => ({
    status: STATUSES.find((status) => status === search.status),
  }),
  component: DiscountsPage,
})

function DiscountsPage() {
  const { status } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="product.view">
      <DiscountList
        status={status ?? 'current'}
        onStatusChange={(next) =>
          navigate({ search: { status: next === 'current' ? undefined : next }, replace: true })
        }
      />
    </PermissionGate>
  )
}
