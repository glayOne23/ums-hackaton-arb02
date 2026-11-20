import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { StockCountView } from '@/features/inventory/components/StockCountView'

export const Route = createFileRoute('/office/inventory/count')({
  component: () => (
    <PermissionGate permission="inventory.view">
      <StockCountView />
    </PermissionGate>
  ),
})
