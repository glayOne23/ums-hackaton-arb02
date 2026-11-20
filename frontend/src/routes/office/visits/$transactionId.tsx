import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { VisitDetail } from '@/features/sales/components/VisitDetail'

export const Route = createFileRoute('/office/visits/$transactionId')({
  component: function VisitDetailPage() {
    const { transactionId } = Route.useParams()
    return (
      <PermissionGate permission="visit.view">
        <VisitDetail transactionId={transactionId} />
      </PermissionGate>
    )
  },
})
