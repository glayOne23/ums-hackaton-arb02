import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronRight,
  CirclePause,
  Eye,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { ROW_ACTION, RowActionLabel, RowActions, RowActionsHeader } from '@/components/common/RowActions'
import { StatusChip } from '@/components/common/StatusChip'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { ExportButton } from '@/features/import/components/ExportButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatCurrency, formatNumber, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useCategories, useProducts, useRestoreProduct } from '../api'
import type { Product, ProductFilters, ProductStatusFilter, ProductStockTotals } from '../types'
import { DeleteProductButton } from './ProductDetail'

const PER_PAGE = 25

const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Product>()

type StockMap = Record<string, ProductStockTotals>

/** A stock number in a table cell; "—" when the API sent no stock (no permission) */
function StockCell({ value }: { value: number | undefined }) {
  return (
    <span className={`block text-right tabular-nums ${value ? 'font-medium' : 'text-muted-foreground'}`}>
      {value === undefined ? '—' : formatNumber(value)}
    </span>
  )
}

/**
 * Stock per place for the office (product.manage / inventory.view): how many
 * outlets hold the product, and how much is in the warehouse, at outlets, and with sales.
 */
function stockColumns(stock: StockMap) {
  const at = (id: string) => stock[id]
  return [
    helper.display({
      id: 'outlet_count',
      header: () => <span className="block text-right">Outlet</span>,
      cell: (info) => <StockCell value={at(info.row.original.id)?.outlet_count} />,
    }),
    helper.display({
      id: 'warehouse_qty',
      header: () => <span className="block text-right">Stok gudang</span>,
      cell: (info) => <StockCell value={at(info.row.original.id)?.warehouse_qty} />,
    }),
    helper.display({
      id: 'outlet_qty',
      header: () => <span className="block text-right">Stok di outlet</span>,
      cell: (info) => <StockCell value={at(info.row.original.id)?.outlet_qty} />,
    }),
    helper.display({
      id: 'sales_qty',
      header: () => <span className="block text-right">Dibawa sales</span>,
      cell: (info) => <StockCell value={at(info.row.original.id)?.sales_qty} />,
    }),
  ]
}

const baseColumns = helper.columns([
  helper.accessor('code', {
    header: 'Kode',
    cell: (info) => <span className="whitespace-nowrap text-muted-foreground tabular-nums">{info.getValue()}</span>,
  }),
  helper.accessor('name', {
    header: 'Nama produk',
    cell: (info) => {
      const product = info.row.original
      return (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to="/office/products/$productId"
            params={{ productId: product.id }}
            className="font-semibold text-leaf-800 underline decoration-leaf-600/40 underline-offset-4 hover:decoration-leaf-700"
          >
            {product.name}
          </Link>
          {!product.is_active && (
            <StatusChip variant="neutral" icon={CirclePause}>
              Nonaktif
            </StatusChip>
          )}
        </span>
      )
    },
  }),
  helper.accessor((row) => row.category?.name ?? '', { id: 'category', header: 'Kategori' }),
  helper.accessor('bpom_number', {
    header: 'No. BPOM',
    cell: (info) => <span className="whitespace-nowrap">{info.getValue() ?? '—'}</span>,
  }),
  helper.accessor('unit', { header: 'Satuan' }),
  helper.accessor('selling_price', {
    header: () => <span className="block text-right">Harga jual</span>,
    cell: (info) => (
      <span className="block text-right whitespace-nowrap tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
])

const actionsColumn = helper.display({
  id: 'actions',
  header: () => <RowActionsHeader />,
  cell: (info) => <ProductRowActions product={info.row.original} />,
})

/** Detail · Ubah · Hapus, the same pages and dialog as the product page (UI guide §7.4). */
function ProductRowActions({ product }: { product: Product }) {
  const canManage = usePermission('product.manage')

  return (
    <RowActions>
      <Button asChild variant="secondary" size="row" className={ROW_ACTION}>
        <Link
          to="/office/products/$productId"
          params={{ productId: product.id }}
          aria-label={`Detail ${product.name}`}
          title="Detail"
        >
          <Eye aria-hidden />
          <RowActionLabel>Detail</RowActionLabel>
        </Link>
      </Button>
      {canManage && (
        <>
          <Button asChild variant="outline" size="row" className={ROW_ACTION}>
            <Link
              to="/office/products/$productId/edit"
              params={{ productId: product.id }}
              aria-label={`Ubah ${product.name}`}
              title="Ubah"
            >
              <Pencil aria-hidden />
              <RowActionLabel>Ubah</RowActionLabel>
            </Link>
          </Button>
          <DeleteProductButton product={product} compact />
        </>
      )}
    </RowActions>
  )
}

/** Columns hidden below 1024 px; the stock numbers stay visible on tablets */
const DESKTOP_ONLY = new Set(['code', 'category', 'bpom_number', 'unit'])
/** With the four stock columns the table only fits BPOM and unit from 1536 px (both stay on the product page) */
const WIDE_ONLY = new Set(['bpom_number', 'unit'])

function columnClass(id: string, withStock: boolean): string {
  if (withStock && WIDE_ONLY.has(id)) return 'hidden 2xl:table-cell'
  return DESKTOP_ONLY.has(id) ? 'hidden lg:table-cell' : ''
}

interface Props {
  filters: ProductFilters
  onFiltersChange: (next: ProductFilters) => void
}

/** W4 — product list: search (name, code, other name, BPOM), category, status. */
export function ProductList({ filters, onFiltersChange }: Props) {
  const canManage = usePermission('product.manage')
  const categories = useCategories()
  const products = useProducts({ ...filters, per_page: PER_PAGE })
  const meta = products.data?.meta
  const stock = products.data?.stock
  // Stable while the same "stock" object is shown, so the table does not rebuild on every render
  const columns = useMemo(
    () => (stock ? [...baseColumns, ...stockColumns(stock), actionsColumn] : [...baseColumns, actionsColumn]),
    [stock],
  )
  const table = useTable({ features, columns, data: products.data?.data ?? [] })

  const [search, setSearch] = useState(filters.search ?? '')
  const [appliedSearch, setAppliedSearch] = useState(filters.search)
  if (filters.search !== appliedSearch) {
    setAppliedSearch(filters.search)
    setSearch(filters.search ?? '')
  }
  useEffect(() => {
    if (search === (filters.search ?? '')) return
    const timer = setTimeout(() => onFiltersChange({ ...filters, search: search || undefined, page: undefined }), 300)
    return () => clearTimeout(timer)
  }, [search, filters, onFiltersChange])

  const set = (patch: Partial<ProductFilters>) => onFiltersChange({ ...filters, ...patch, page: undefined })
  const deleted = filters.status === 'deleted'

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <PageHeader
        icon={Package}
        title="Produk"
        description={meta && <>{formatNumber(meta.total)} produk</>}
        actions={
          <>
            <ExportButton type="products" title="Produk" />
            {canManage && (
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/office/products/new">
                  <Plus aria-hidden />
                  Tambah produk
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product-search">Cari</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="product-search"
              type="search"
              className="pl-9"
              placeholder="Nama, kode, nama lain, atau no. BPOM"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-category">Kategori</Label>
          <NativeSelect
            id="filter-category"
            value={filters.category_id ?? ''}
            onChange={(event) => set({ category_id: event.target.value || undefined })}
          >
            <option value="">Semua</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-product-status">Status</Label>
          <NativeSelect
            id="filter-product-status"
            value={filters.status ?? 'active'}
            onChange={(event) => {
              const status = event.target.value as ProductStatusFilter
              set({ status: status === 'active' ? undefined : status })
            }}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
            {canManage && <option value="deleted">Terhapus</option>}
          </NativeSelect>
        </div>
      </div>

      {products.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat daftar produk">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : products.isError ? (
        <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
      ) : products.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <Package className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">
            {deleted
              ? 'Tidak ada produk terhapus.'
              : filters.search || filters.category_id
                ? 'Tidak ada produk yang cocok.'
                : 'Belum ada produk.'}
          </p>
          {(filters.search || filters.category_id || filters.status) && (
            <Button variant="outline" onClick={() => onFiltersChange({})}>
              Hapus filter
            </Button>
          )}
        </div>
      ) : deleted ? (
        <DeletedProducts products={products.data.data} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card sm:block">
            <table className="w-full text-left">
              <thead className="bg-table-head text-table-head-foreground print:bg-transparent print:text-foreground">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className={`h-11 px-4 text-sm font-semibold ${columnClass(header.column.id, Boolean(stock))}`}
                      >
                        <table.FlexRender header={header} />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-border transition-colors hover:bg-row-hover">
                    {row.getAllCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`h-12 px-4 py-2 ${columnClass(cell.column.id, Boolean(stock))}`}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 sm:hidden">
            {products.data.data.map((product) => (
              <li key={product.id}>
                <Link
                  to="/office/products/$productId"
                  params={{ productId: product.id }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card active:bg-accent"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-lg font-semibold">{product.name}</span>
                      <span className="font-semibold whitespace-nowrap tabular-nums">
                        {formatCurrency(product.selling_price)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {product.code} · {product.category?.name} · {product.unit}
                    </span>
                    {stock?.[product.id] && (
                      <span className="text-sm tabular-nums">
                        Gudang {formatNumber(stock[product.id].warehouse_qty)} · Outlet{' '}
                        {formatNumber(stock[product.id].outlet_qty)} ({formatNumber(stock[product.id].outlet_count)}{' '}
                        outlet) · Sales {formatNumber(stock[product.id].sales_qty)}
                      </span>
                    )}
                    {!product.is_active && (
                      <StatusChip variant="neutral" icon={CirclePause} className="w-fit">
                        Nonaktif
                      </StatusChip>
                    )}
                  </span>
                  <ChevronRight className="size-6 shrink-0 text-leaf-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {meta && (
            <Pagination meta={meta} onPageChange={(page) => onFiltersChange({ ...filters, page })} noun="produk" />
          )}
        </>
      )}

      {canManage && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:hidden">
          <Button asChild size="cta">
            <Link to="/office/products/new">
              <Plus aria-hidden />
              Tambah produk
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

function DeletedProducts({ products }: { products: Product[] }) {
  const restore = useRestoreProduct()
  const navigate = useNavigate()

  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => {
        const restoring = restore.isPending && restore.variables === product.id
        return (
          <li
            key={product.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card shadow-card p-4 sm:flex-nowrap"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{product.name}</span>
                <StatusChip variant="neutral" icon={Trash2}>
                  Terhapus
                </StatusChip>
              </span>
              <span className="text-muted-foreground">
                {product.code} · {product.category?.name}
              </span>
              {product.deleted_at && (
                <span className="text-sm text-muted-foreground">
                  Dihapus {formatTableDate(new Date(product.deleted_at))}
                  {product.deleted_by && ` oleh ${product.deleted_by.name}`}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={restoring}
              onClick={() =>
                restore.mutate(product.id, {
                  onSuccess: () => {
                    toast.success(`Produk ${product.name} dipulihkan`)
                    navigate({ to: '/office/products/$productId', params: { productId: product.id } })
                  },
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              {restoring ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
              Pulihkan
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
