import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { OutletForm } from '@/features/outlet/components/OutletForm'

export const Route = createFileRoute('/office/outlets/new')({
  component: NewOutletPage,
})

function NewOutletPage() {
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="outlet.manage">
      <section className="flex flex-col gap-6">
        <Link to="/office/outlets" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
          <ArrowLeft className="size-5" aria-hidden />
          Daftar outlet
        </Link>
        <h1 className="text-2xl font-semibold">Tambah outlet</h1>
        <OutletForm
          onSaved={(outlet) => {
            toast.success(`Outlet ${outlet.name} tersimpan`)
            // Next step is usually assigning a sales, which lives on the profile page
            navigate({
              to: '/office/outlets/$outletId',
              params: { outletId: outlet.id },
            })
          }}
          onCancel={() => navigate({ to: '/office/outlets' })}
        />
      </section>
    </PermissionGate>
  )
}
