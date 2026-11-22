import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ProductForm } from '@/features/product/components/ProductForm'

export const Route = createFileRoute('/office/products/new')({
  component: NewProductPage,
})

function NewProductPage() {
  const navigate = Route.useNavigate()

  return (
    <PermissionGate permission="product.manage">
      <section className="flex flex-col gap-6">
        <Link to="/office/products" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
          <ArrowLeft className="size-5" aria-hidden />
          Daftar produk
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Tambah produk</h1>
        <ProductForm
          onSaved={(product) => {
            toast.success(`Produk ${product.name} tersimpan`)
            navigate({ to: '/office/products/$productId', params: { productId: product.id } })
          }}
          onCancel={() => navigate({ to: '/office/products' })}
        />
      </section>
    </PermissionGate>
  )
}
