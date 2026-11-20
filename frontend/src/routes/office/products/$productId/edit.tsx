import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { PermissionGate } from '@/components/common/PermissionGate'
import { useProduct } from '@/features/product/api'
import { ProductForm } from '@/features/product/components/ProductForm'

export const Route = createFileRoute('/office/products/$productId/edit')({
  component: EditProductPage,
})

function EditProductPage() {
  const { productId } = Route.useParams()
  const navigate = Route.useNavigate()
  const product = useProduct(productId)
  const back = () => navigate({ to: '/office/products/$productId', params: { productId } })

  return (
    <PermissionGate permission="product.manage">
      <section className="flex flex-col gap-6">
        <Link
          to="/office/products/$productId"
          params={{ productId }}
          className="flex w-fit items-center gap-2 font-medium text-leaf-700"
        >
          <ArrowLeft className="size-5" aria-hidden />
          Data produk
        </Link>
        <h1 className="text-2xl font-semibold">Ubah data produk</h1>
        {product.isPending ? (
          <div
            className="h-96 max-w-[720px] animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
            aria-busy="true"
          />
        ) : product.isError ? (
          <ErrorState message={product.error.message} onRetry={() => product.refetch()} />
        ) : (
          <ProductForm
            product={product.data}
            onSaved={() => {
              toast.success('Perubahan tersimpan')
              back()
            }}
            onCancel={back}
          />
        )}
      </section>
    </PermissionGate>
  )
}
