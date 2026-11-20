import { createFileRoute } from '@tanstack/react-router'
import { ReceiptView } from '@/features/sales/components/ReceiptView'

// M4 — nota, read from the phone (also before it reaches the server)
export const Route = createFileRoute('/field/receipt/$clientUuid')({
  component: function ReceiptPage() {
    const { clientUuid } = Route.useParams()
    return <ReceiptView clientUuid={clientUuid} />
  },
})
