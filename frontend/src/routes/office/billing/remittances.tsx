import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RemittanceView } from '@/features/billing/components/RemittanceView'

// W6 — sales remittances (TG-03)
export const Route = createFileRoute('/office/billing/remittances')({
  component: () => (
    <PermissionGate permission="invoice.view">
      <RemittanceView />
    </PermissionGate>
  ),
})
