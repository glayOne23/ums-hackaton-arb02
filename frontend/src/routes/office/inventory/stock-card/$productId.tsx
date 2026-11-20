import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { StockCardView } from '@/features/inventory/components/StockCardView'

export const Route = createFileRoute('/office/inventory/stock-card/$productId')({
  component: StockCardPage,
})

function StockCardPage() {
  const { productId } = Route.useParams()

  return (
    <PermissionGate permission="inventory.view">
      <StockCardView productId={productId} />
    </PermissionGate>
  )
}
