import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { InvoiceList } from '@/features/billing/components/InvoiceList'

// W6 — unpaid invoices (TG-01)
export const Route = createFileRoute('/office/billing/')({
  component: () => (
    <PermissionGate permission="invoice.view">
      <InvoiceList />
    </PermissionGate>
  ),
})
