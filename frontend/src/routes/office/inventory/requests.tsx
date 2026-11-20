import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { StockRequestBoard } from '@/features/inventory/components/StockRequestBoard'

export const Route = createFileRoute('/office/inventory/requests')({
  component: () => (
    <PermissionGate permission="stock_request.view">
      <StockRequestBoard />
    </PermissionGate>
  ),
})
