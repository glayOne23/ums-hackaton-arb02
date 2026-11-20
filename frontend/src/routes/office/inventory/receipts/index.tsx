import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { GoodsReceiptList } from '@/features/inventory/components/GoodsReceiptList'

export const Route = createFileRoute('/office/inventory/receipts/')({
  component: () => (
    <PermissionGate permission="inventory.view">
      <GoodsReceiptList />
    </PermissionGate>
  ),
})
