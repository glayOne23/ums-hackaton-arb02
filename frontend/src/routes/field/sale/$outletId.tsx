import { createFileRoute } from '@tanstack/react-router'
import { DirectSale } from '@/features/sales/components/DirectSale'

// M5 + M3 — direct sale (cash / credit outlets) and payment
export const Route = createFileRoute('/field/sale/$outletId')({
  component: function SalePage() {
    const { outletId } = Route.useParams()
    return <DirectSale key={outletId} outletId={outletId} />
  },
})
