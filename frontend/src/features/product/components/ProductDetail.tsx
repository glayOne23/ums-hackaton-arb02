import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CirclePause, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { productKeys, useDeleteProduct, useProduct } from '../api'
import type { Product } from '../types'
import { HistoryPanel } from '@/features/correction/components/HistoryPanel'
import { MergeDuplicateButton } from '@/features/correction/components/MergeDuplicateButton'

/** Product data, readable by everyone with product.view; change and delete with product.manage. */
export function ProductDetail({ productId }: { productId: string }) {
  const product = useProduct(productId)

  if (product.isPending) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
  }
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404
    return (
      <ErrorState
        message={notFound ? 'Produk tidak ditemukan. Mungkin sudah dihapus.' : product.error.message}
        onRetry={notFound ? undefined : () => product.refetch()}
      />
    )
  }

  return <Content product={product.data} />
}

function Content({ product }: { product: Product }) {
  const canManage = usePermission('product.manage')

  return (
    <article className="flex flex-col gap-6">
      <Link to="/office/products" className="flex w-fit items-center gap-2 font-medium text-leaf-700">
        <ArrowLeft className="size-5" aria-hidden />
        Daftar produk
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground tabular-nums">{product.code}</p>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
            {product.name}
            {!product.is_active && (
              <StatusChip variant="neutral" icon={CirclePause}>
                Nonaktif
              </StatusChip>
            )}
          </h1>
          <p className="text-muted-foreground">
            {product.category?.name} · {product.unit}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/office/products/$productId/edit" params={{ productId: product.id }}>
                <Pencil aria-hidden />
                Ubah data
              </Link>
            </Button>
            <MergeDuplicateButton kind="product" kept={product} />
            <DeleteProductButton product={product} />
          </div>
        )}
      </header>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 sm:p-6">
        <Info label="Harga jual" value={formatCurrency(product.selling_price)} />
        <Info label="Nomor BPOM" value={product.bpom_number} />
        <Info label="Stok minimum gudang" value={`${formatNumber(product.min_stock_qty)} ${product.unit}`} />
        <Info label="Nama lain di Excel lama" value={product.aliases?.join(', ') || null} />
      </section>

      <HistoryPanel type="product" id={product.id} />

      <p className="text-sm text-muted-foreground">
        Harga setelah potongan per jenis outlet ada di{' '}
        <Link to="/office/price-list" className="font-medium text-leaf-700 underline underline-offset-4">
          Daftar harga
        </Link>
        . Stok per batch tampil di sini setelah modul gudang tersedia.
      </p>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span>{value || '—'}</span>
    </div>
  )
}

/** Move to the trash, with "Urungkan" in the toast (UX-07). */
function DeleteProductButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const remove = useDeleteProduct()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Plain call: the toast outlives this page
  const undo = async () => {
    try {
      await api(`/products/${product.id}/restore`, { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: productKeys.all })
      toast.success(`Produk ${product.name} dipulihkan`)
      navigate({ to: '/office/products/$productId', params: { productId: product.id } })
    } catch {
      toast.error('Produk belum bisa dipulihkan. Coba lagi dari daftar produk, filter Status: Terhapus.')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) remove.reset()
      }}
      trigger={
        <Button variant="danger-outline">
          <Trash2 aria-hidden />
          Hapus produk
        </Button>
      }
      title={`Hapus ${product.name}?`}
      description="Produk hilang dari daftar produk dan daftar harga. Data dan potongannya tetap tersimpan, dan produk bisa dipulihkan dari daftar produk dengan filter Status: Terhapus. Produk yang tidak dijual lagi sebaiknya dinonaktifkan saja."
      confirmLabel="Hapus produk"
      pending={remove.isPending}
      error={remove.error?.message}
      onConfirm={() =>
        remove.mutate(product.id, {
          onSuccess: () => {
            setOpen(false)
            toast.success(`Produk ${product.name} dihapus`, {
              action: { label: 'Urungkan', onClick: undo },
              duration: 8000,
            })
            navigate({ to: '/office/products' })
          },
        })
      }
    />
  )
}
