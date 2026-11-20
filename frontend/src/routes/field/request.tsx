import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { StockRequestForm } from '@/features/inventory/components/StockRequestForm'

export const Route = createFileRoute('/field/request')({
  component: RequestPage,
})

function RequestPage() {
  const navigate = Route.useNavigate()

  return (
    <StockRequestForm
      onSaved={() => {
        toast.success('Permintaan terkirim ke gudang')
        navigate({ to: '/field/today' })
      }}
    />
  )
}
