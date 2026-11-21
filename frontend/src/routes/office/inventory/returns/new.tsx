import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ReturnForm } from '@/features/inventory/components/ReturnForm'

export const Route = createFileRoute('/office/inventory/returns/new')({
  component: NewReturnPage,
})

function NewReturnPage() {
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="inventory.manage">
      <section className="flex flex-col gap-6">
        <Link to="/office/inventory/returns" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
          <ArrowLeft className="size-5" aria-hidden />
          Retur dari sales
        </Link>
        <h1 className="text-2xl font-semibold">Terima retur</h1>
        <ReturnForm
          onSaved={(result) => {
            if (result.queued) toast.info('Retur tersimpan di perangkat. Terkirim otomatis saat ada sinyal.')
            else toast.success(`${result.data.number} tersimpan`)
            navigate({ to: '/office/inventory/returns' })
          }}
          onCancel={() => navigate({ to: '/office/inventory/returns' })}
        />
      </section>
    </PermissionGate>
  )
}
