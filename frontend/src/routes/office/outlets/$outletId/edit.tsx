import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useOutlet } from '@/features/outlet/api'
import { OutletForm } from '@/features/outlet/components/OutletForm'

export const Route = createFileRoute('/office/outlets/$outletId/edit')({
  component: EditOutletPage,
})

function EditOutletPage() {
  const { outletId } = Route.useParams()
  const navigate = Route.useNavigate()
  const outlet = useOutlet(outletId)
  const backToProfile = () => navigate({ to: '/office/outlets/$outletId', params: { outletId } })

  return (
    <PermissionGate permission="outlet.manage">
      <section className="flex flex-col gap-6">
        <Link
          to="/office/outlets/$outletId"
          params={{ outletId }}
          className="flex w-fit items-center gap-2 font-medium text-leaf-700"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Profil outlet
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Ubah data outlet</h1>
        {outlet.isPending ? (
          <div
            className="h-96 max-w-[720px] animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
            aria-busy="true"
          />
        ) : outlet.isError ? (
          <ErrorState message={outlet.error.message} onRetry={() => outlet.refetch()} />
        ) : (
          <OutletForm
            outlet={outlet.data}
            onSaved={() => {
              toast.success('Perubahan tersimpan')
              backToProfile()
            }}
            onCancel={backToProfile}
          />
        )}
      </section>
    </PermissionGate>
  )
}
