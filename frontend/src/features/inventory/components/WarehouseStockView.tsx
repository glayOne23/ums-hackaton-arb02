import { Link } from '@tanstack/react-router'
import { ChevronDown, CircleCheck, Clock, PackageOpen, Plus, TriangleAlert } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatExpiry, formatNumber, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useWarehouseStock } from '../api'
import type { ProductStock } from '../types'
import { InventoryTabs } from './InventoryTabs'

type Filter = 'all' | 'attention'

/** W5 — warehouse stock per product, batches on demand, warnings first (GD-07, GD-08). */
export function WarehouseStockView() {
  const canManage = usePermission('inventory.manage')
  const stock = useWarehouseStock()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const query = useDeferredValue(search.trim().toLowerCase())

  const rows = (stock.data?.data ?? []).filter((row) => {
    const matches =
      query === '' || row.product.name.toLowerCase().includes(query) || row.product.code.toLowerCase().includes(query)
    const attention = row.below_minimum || row.near_expiry_qty > 0 || row.qty === 0
    return matches && (filter === 'all' || attention)
  })

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gudang</h1>
          <p className="text-muted-foreground">Stok di gudang per produk. Ketuk produk untuk melihat batch.</p>
        </div>
        {canManage && (
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/office/inventory/receipts/new">
              <Plus aria-hidden />
              Barang masuk
            </Link>
          </Button>
        )}
      </header>

      <InventoryTabs />

      {stock.data && (stock.data.alerts.below_minimum > 0 || stock.data.alerts.near_expiry_qty > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {stock.data.alerts.near_expiry_qty > 0 && (
            <p role="status" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              {formatNumber(stock.data.alerts.near_expiry_qty)} barang ED sebelum{' '}
              {formatTableDate(new Date(stock.data.expiry_warning_date))}.
            </p>
          )}
          {stock.data.alerts.below_minimum > 0 && (
            <p role="status" className="flex items-start gap-2 rounded-md bg-warning-soft px-4 py-3 text-warning-text">
              <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
              {stock.data.alerts.below_minimum} produk di bawah stok minimum.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="search"
          aria-label="Cari produk"
          placeholder="Cari nama atau kode produk"
          className="sm:max-w-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 sm:w-80" role="group" aria-label="Tampilkan">
          {(
            [
              ['all', 'Semua'],
              ['attention', 'Perlu perhatian'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              aria-pressed={filter === value}
              className={filter === value ? 'border-primary bg-accent text-accent-foreground' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {stock.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat stok">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : stock.isError ? (
        <ErrorState message={stock.error.message} onRetry={() => stock.refetch()} />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-12 text-center">
          <PackageOpen className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">{filter === 'attention' ? 'Semua stok aman.' : 'Tidak ada produk yang cocok.'}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <StockRow key={row.product.id} row={row} />
          ))}
        </ul>
      )}

      {canManage && (
        <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 sm:hidden">
          <Button asChild size="cta">
            <Link to="/office/inventory/receipts/new">
              <Plus aria-hidden />
              Barang masuk
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}

function StockRow({ row }: { row: ProductStock }) {
  const [open, setOpen] = useState(false)
  const { product } = row

  return (
    <li className="rounded-lg border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg font-semibold">{product.name}</span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {product.code} · min. {formatNumber(product.min_stock_qty)} {product.unit}
            {row.nearest_expiry && ` · ED terdekat ${formatExpiry(new Date(row.nearest_expiry)).replace('ED ', '')}`}
          </span>
          <span className="flex flex-wrap gap-2">
            {row.qty === 0 && (
              <StatusChip variant="warning" icon={Clock}>
                Habis
              </StatusChip>
            )}
            {row.qty > 0 && row.below_minimum && (
              <StatusChip variant="warning" icon={Clock}>
                Di bawah minimum
              </StatusChip>
            )}
            {row.near_expiry_qty > 0 && (
              <StatusChip variant="danger" icon={TriangleAlert}>
                {formatNumber(row.near_expiry_qty)} dekat ED
              </StatusChip>
            )}
            {row.qty > 0 && !row.below_minimum && row.near_expiry_qty === 0 && (
              <StatusChip variant="success" icon={CircleCheck}>
                Aman
              </StatusChip>
            )}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-right">
            <span className="block text-2xl font-semibold tabular-nums">{formatNumber(row.qty)}</span>
            <span className="block text-sm text-muted-foreground">{product.unit}</span>
          </span>
          <ChevronDown className={`size-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-earth-200 p-4">
          {row.batches && row.batches.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-muted-foreground">
                  <th scope="col" className="pb-2 font-semibold">
                    Batch
                  </th>
                  <th scope="col" className="pb-2 font-semibold">
                    ED
                  </th>
                  <th scope="col" className="pb-2 text-right font-semibold">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody>
                {row.batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-earth-200">
                    <td className="py-2">{batch.batch_number}</td>
                    <td className={`py-2 ${batch.near_expiry ? 'font-semibold text-danger-text' : ''}`}>
                      {formatExpiry(new Date(batch.expiry_date))}
                      {batch.near_expiry && <TriangleAlert className="ml-1 inline size-4" aria-label="dekat ED" />}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(batch.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground">Belum ada stok untuk produk ini.</p>
          )}
          <Link
            to="/office/inventory/stock-card/$productId"
            params={{ productId: product.id }}
            className="w-fit font-medium text-leaf-700 underline underline-offset-4"
          >
            Lihat kartu stok
          </Link>
        </div>
      )}
    </li>
  )
}
