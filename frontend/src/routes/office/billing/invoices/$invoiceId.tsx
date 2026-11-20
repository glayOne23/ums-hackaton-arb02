import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { InvoiceDetail } from '@/features/billing/components/InvoiceDetail'

export const Route = createFileRoute('/office/billing/invoices/$invoiceId')({
  component: function InvoicePage() {
    const { invoiceId } = Route.useParams()
    return (
      <PermissionGate permission="invoice.view">
        <InvoiceDetail invoiceId={invoiceId} />
      </PermissionGate>
    )
  },
})
