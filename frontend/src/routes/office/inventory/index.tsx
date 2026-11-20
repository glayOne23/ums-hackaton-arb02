import { createFileRoute, Navigate } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { WarehouseStockView } from '@/features/inventory/components/WarehouseStockView'
import { usePermission } from '@/stores/session'

export const Route = createFileRoute('/office/inventory/')({
  component: InventoryPage,
})

function InventoryPage() {
  const canViewStock = usePermission('inventory.view')
  const canViewRequests = usePermission('stock_request.view')

  // The office admin follows requests but does not manage stock: open their part directly
  if (!canViewStock && canViewRequests) return <Navigate to="/office/inventory/requests" replace />

  return (
    <PermissionGate permission="inventory.view">
      <WarehouseStockView />
    </PermissionGate>
  )
}
