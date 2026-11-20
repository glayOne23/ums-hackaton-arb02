import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DiscountForm } from '@/features/product/components/DiscountForm'

export const Route = createFileRoute('/office/discounts/new')({
  component: NewDiscountPage,
})

function NewDiscountPage() {
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="product.manage">
      <section className="flex flex-col gap-6">
        <Link to="/office/discounts" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
          <ArrowLeft className="size-5" aria-hidden />
          Daftar potongan
        </Link>
        <h1 className="text-2xl font-semibold">Tambah potongan</h1>
        <DiscountForm
          onSaved={(discount) => {
            toast.success(
              discount.status.value === 'pending'
                ? 'Potongan diajukan. Menunggu persetujuan Pimpinan.'
                : 'Potongan tersimpan dan berlaku.',
            )
            navigate({ to: '/office/discounts' })
          }}
          onCancel={() => navigate({ to: '/office/discounts' })}
        />
      </section>
    </PermissionGate>
  )
}
