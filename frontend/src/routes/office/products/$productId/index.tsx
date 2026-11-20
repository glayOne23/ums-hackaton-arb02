import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '@/components/common/PermissionGate'
import { ProductDetail } from '@/features/product/components/ProductDetail'

export const Route = createFileRoute('/office/products/$productId/')({
  component: ProductPage,
})

function ProductPage() {
  const { productId } = Route.useParams()

  return (
    <PermissionGate permission="product.view">
      <ProductDetail productId={productId} />
    </PermissionGate>
  )
}
