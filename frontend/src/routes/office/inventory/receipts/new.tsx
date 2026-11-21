import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { GoodsReceiptForm } from '@/features/inventory/components/GoodsReceiptForm'

export const Route = createFileRoute('/office/inventory/receipts/new')({
  component: NewReceiptPage,
})

function NewReceiptPage() {
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="inventory.manage">
      <section className="flex flex-col gap-6">
        <Link to="/office/inventory/receipts" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
          <ArrowLeft className="size-5" aria-hidden />
          Barang masuk
        </Link>
        <h1 className="text-2xl font-semibold">Catat barang masuk</h1>
        <GoodsReceiptForm
          onSaved={(result) => {
            if (result.queued) toast.info('Barang masuk tersimpan di perangkat. Terkirim otomatis saat ada sinyal.')
            else toast.success(`${result.data.number} tersimpan, stok gudang bertambah ${result.data.total_qty}`)
            navigate({ to: '/office/inventory/receipts' })
          }}
          onCancel={() => navigate({ to: '/office/inventory/receipts' })}
        />
      </section>
    </PermissionGate>
  )
}
