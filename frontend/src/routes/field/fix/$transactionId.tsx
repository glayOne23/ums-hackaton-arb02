import { createFileRoute } from '@tanstack/react-router'
import { FieldCorrection } from '@/features/sales/components/FieldCorrection'

// KR-01 — the sales fixes their own nota (W11 on the phone)
export const Route = createFileRoute('/field/fix/$transactionId')({
  component: function FieldFixPage() {
    const { transactionId } = Route.useParams()
    return <FieldCorrection transactionId={transactionId} />
  },
})
