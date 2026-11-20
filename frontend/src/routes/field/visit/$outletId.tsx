import { createFileRoute } from '@tanstack/react-router'
import { ConsignmentVisit } from '@/features/sales/components/ConsignmentVisit'

// M2 + M3 — consignment visit and payment
export const Route = createFileRoute('/field/visit/$outletId')({
  component: function VisitPage() {
    const { outletId } = Route.useParams()
    return <ConsignmentVisit key={outletId} outletId={outletId} />
  },
})
