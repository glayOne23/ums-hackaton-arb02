import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ProposeOutletView } from '@/features/sales/components/ProposeOutletView'

// OT-05 — a sales proposes a new outlet from the field
export const Route = createFileRoute('/field/propose')({
  component: () => (
    <PermissionGate permission="outlet.propose">
      <ProposeOutletView />
    </PermissionGate>
  ),
})
