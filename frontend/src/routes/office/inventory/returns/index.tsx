import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ReturnList } from '@/features/inventory/components/ReturnList'

export const Route = createFileRoute('/office/inventory/returns/')({
  component: () => (
    <PermissionGate permission="inventory.view">
      <ReturnList />
    </PermissionGate>
  ),
})
