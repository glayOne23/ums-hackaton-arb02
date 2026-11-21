import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { VisitDetail } from '@/features/sales/components/VisitDetail'

interface Search {
  /** Open the correction form prefilled with the phone's numbers (from "Perlu dicek") */
  pakai?: 'hp'
}

export const Route = createFileRoute('/office/visits/$transactionId')({
  validateSearch: (search: Record<string, unknown>): Search => (search.pakai === 'hp' ? { pakai: 'hp' } : {}),
  component: function VisitDetailPage() {
    const { transactionId } = Route.useParams()
    const { pakai } = Route.useSearch()
    return (
      <PermissionGate permission="visit.view">
        <VisitDetail transactionId={transactionId} fromPhone={pakai === 'hp'} />
      </PermissionGate>
    )
  },
})
