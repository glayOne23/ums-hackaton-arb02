import { Link } from '@tanstack/react-router'
import { format, startOfMonth } from 'date-fns'
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Printer } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatExpiry, formatNumber, formatTableDate, formatTime } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useLocationMovements, useMovementOptions, useProductOptions } from '../api'
import type { MovementFilters, MovementPlace, MovementRow } from '../types'
import { InventoryTabs } from './InventoryTabs'

const PLACES: { value: MovementPlace; label: string; needsWarehouse: boolean }[] = [
  { value: 'warehouse', label: 'Gudang', needsWarehouse: true },
  { value: 'outlet', label: 'Rak outlet', needsWarehouse: false },
  { value: 'sales', label: 'Bawaan sales', needsWarehouse: true },
]

/** Same order and words as MovementType on the server */
const TYPES: { value: string; label: string }[] = [
  { value: 'receipt', label: 'Barang masuk' },
  { value: 'issue', label: 'Keluar ke sales' },
  { value: 'refill', label: 'Isi ulang ke outlet' },
  { value: 'sale', label: 'Laku' },
  { value: 'withdrawal', label: 'Tarik dari outlet' },
  { value: 'return', label: 'Retur ke gudang' },
  { value: 'disposal', label: 'Musnah' },
  { value: 'adjustment', label: 'Opname' },
  { value: 'correction', label: 'Koreksi' },
  { value: 'batch_correction', label: 'Koreksi ED' },
]

/**
 * Stock in and out of one place over a period: the warehouse, an outlet's
 * shelf, or what a sales carries. A total per product, then every movement
 * with the document that caused it. Filters live in the URL.
 */
export function StockMovementsView({
  filters,
  onFiltersChange,
}: {
  filters: MovementFilters
  onFiltersChange: (next: MovementFilters) => void
}) {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  const warehouseAccess = permissions.includes('inventory.view') || permissions.includes('stock_request.view')
  const places = PLACES.filter((p) => warehouseAccess || !p.needsWarehouse)
  const place = places.some((p) => p.value === filters.place) ? filters.place : places[0].value

  const options = useMovementOptions()
  const products = useProductOptions()
  // Default period: this month so far, fixed when the page opens
  const [today] = useState(() => new Date())
  const range = {
    from: filters.from ?? format(startOfMonth(today), 'yyyy-MM-dd'),
    to: filters.to ?? format(today, 'yyyy-MM-dd'),
  }
  const ready = place === 'warehouse' || (place === 'outlet' ? !!filters.outlet_id : !!filters.sales_user_id)
  const query = { ...filters, place, ...range }
  const movements = useLocationMovements(query, ready)

  // Any filter change starts again at page 1
  const set = (change: Partial<MovementFilters>) => onFiltersChange({ ...filters, place, ...change, page: undefined })

  return (
    <section className="flex flex-col gap-5">
      <InventoryTabs />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keluar-masuk stok</h1>
          <p className="text-muted-foreground">
            {movements.data
              ? `${movements.data.place.name} · ${formatTableDate(new Date(movements.data.from))} – ${formatTableDate(new Date(movements.data.to))}`
              : 'Barang masuk dan keluar per tempat: gudang, rak outlet, atau bawaan sales.'}
          </p>
        </div>
        <Button variant="outline" className="print:hidden" disabled={!movements.data} onClick={() => window.print()}>
          <Printer aria-hidden />
          Cetak
        </Button>
      </header>

      <div className="grid gap-3 print:hidden sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Tempat</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tempat">
            {places.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={place === p.value}
                onClick={() => set({ place: p.value, outlet_id: undefined, sales_user_id: undefined })}
                className={`h-11 rounded-full border px-4 font-medium ${place === p.value ? 'choice-on' : 'choice'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {place === 'outlet' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-outlet">Outlet</Label>
            <NativeSelect
              id="mv-outlet"
              value={filters.outlet_id ?? ''}
              onChange={(e) => set({ outlet_id: e.target.value || undefined })}
            >
              <option value="">Pilih outlet…</option>
              {options.data?.outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.code})
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        {place === 'sales' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-sales">Sales</Label>
            <NativeSelect
              id="mv-sales"
              value={filters.sales_user_id ? String(filters.sales_user_id) : ''}
              onChange={(e) => set({ sales_user_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Pilih sales…</option>
              {options.data?.sales.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mv-product">Produk</Label>
          <NativeSelect
            id="mv-product"
            value={filters.product_id ?? ''}
            onChange={(e) => set({ product_id: e.target.value || undefined })}
          >
            <option value="">Semua produk</option>
            {products.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mv-type">Jenis</Label>
          <NativeSelect
            id="mv-type"
            value={filters.type ?? ''}
            onChange={(e) => set({ type: e.target.value || undefined })}
          >
            <option value="">Semua jenis</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-from">Dari</Label>
            <Input
              id="mv-from"
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => e.target.value && set({ from: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mv-to">Sampai</Label>
            <Input
              id="mv-to"
              type="date"
              value={range.to}
              min={range.from}
              onChange={(e) => e.target.value && set({ to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {!ready ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground shadow-card">
          {place === 'outlet'
            ? 'Pilih outlet untuk melihat keluar-masuk raknya.'
            : 'Pilih sales untuk melihat keluar-masuk bawaannya.'}
        </p>
      ) : movements.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : movements.isError ? (
        <ErrorState message={movements.error.message} onRetry={() => movements.refetch()} />
      ) : (
        <>
          <section aria-labelledby="mv-summary" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="mv-summary" className="text-lg font-semibold">
                Ringkasan per produk
              </h2>
              <p className="flex gap-4 text-lg">
                <span className="flex items-center gap-1 text-success-text">
                  <ArrowDownLeft className="size-5" aria-hidden />
                  Masuk <strong className="tabular-nums">{formatNumber(movements.data.totals.in)}</strong>
                </span>
                <span className="flex items-center gap-1 text-danger-text">
                  <ArrowUpRight className="size-5" aria-hidden />
                  Keluar <strong className="tabular-nums">{formatNumber(movements.data.totals.out)}</strong>
                </span>
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
              <table className="w-full text-left">
                <thead className="bg-table-head text-sm text-table-head-foreground print:bg-transparent print:text-foreground">
                  <tr>
                    <th scope="col" className="h-11 px-3 font-semibold sm:px-4">
                      Produk
                    </th>
                    <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                      Masuk
                    </th>
                    <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                      Keluar
                    </th>
                    <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                      Stok kini
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.summary.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                        Tidak ada keluar-masuk pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                  {movements.data.summary.map((s) => (
                    <tr key={s.product.id} className="border-t border-border">
                      <th scope="row" className="px-3 py-2 text-left font-medium sm:px-4">
                        {s.product.name}
                        <span className="block text-sm font-normal text-muted-foreground">{s.product.code}</span>
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums sm:px-4">{formatNumber(s.in)}</td>
                      <td className="px-3 py-2 text-right tabular-nums sm:px-4">{formatNumber(s.out)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums sm:px-4">
                        {formatNumber(s.now)} {s.product.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Stok kini adalah stok saat ini, bukan stok di akhir rentang tanggal.
            </p>
          </section>

          {movements.data.rows.length > 0 && (
            <section aria-labelledby="mv-rows" className="flex flex-col gap-3">
              <h2 id="mv-rows" className="text-lg font-semibold">
                Rincian ({formatNumber(movements.data.meta.total)})
              </h2>
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
                <table className="w-full text-left">
                  <thead className="bg-table-head text-sm text-table-head-foreground print:bg-transparent print:text-foreground">
                    <tr>
                      <th scope="col" className="h-11 px-3 font-semibold sm:px-4">
                        Tanggal · kejadian
                      </th>
                      <th scope="col" className="hidden h-11 px-4 font-semibold md:table-cell">
                        Batch
                      </th>
                      <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                        Masuk
                      </th>
                      <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                        Keluar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.data.rows.map((row) => (
                      <MovementLine key={row.id} row={row} />
                    ))}
                  </tbody>
                </table>
                <Pagination
                  meta={movements.data.meta}
                  onPageChange={(page) => onFiltersChange({ ...filters, place, page: page > 1 ? page : undefined })}
                  noun="baris"
                  className="rounded-none border-0 border-t shadow-none print:hidden"
                />
              </div>
            </section>
          )}
        </>
      )}
    </section>
  )
}

function MovementLine({ row }: { row: MovementRow }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-2 sm:px-4">
        <span className="block font-medium">
          {row.product.name} · {row.type.label}
        </span>
        {row.basis.value === 'confirmed' && (
          <span className="inline-flex items-center gap-1 text-sm text-success-text">
            <BadgeCheck className="size-4" aria-hidden />
            Batch dipastikan
          </span>
        )}
        <span className="block text-sm text-muted-foreground">
          {formatTableDate(new Date(row.at))} {formatTime(new Date(row.at))}
          {row.counterpart && ` · ${row.in ? 'dari' : 'ke'} ${row.counterpart}`}
          {row.by && ` · oleh ${row.by}`}
        </span>
        {row.document && <DocumentLink document={row.document} />}
        <span className="block text-sm text-muted-foreground md:hidden">
          {row.batch_number} · {formatExpiry(new Date(row.expiry_date))}
        </span>
        {row.note && <span className="block text-sm text-muted-foreground">Catatan: {row.note}</span>}
      </td>
      <td className="hidden px-4 py-2 md:table-cell">
        {row.batch_number}
        <span className="block text-sm text-muted-foreground">{formatExpiry(new Date(row.expiry_date))}</span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-success-text sm:px-4">
        {row.in ? formatNumber(row.in) : ''}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-danger-text sm:px-4">
        {row.out ? formatNumber(row.out) : ''}
      </td>
    </tr>
  )
}

/** The nota or warehouse document behind a movement, opened where the user may */
function DocumentLink({ document }: { document: NonNullable<MovementRow['document']> }) {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  const label = document.number ?? 'dokumen'
  const className =
    'block w-fit text-sm font-medium text-leaf-700 underline-offset-2 hover:underline print:no-underline'

  if (document.kind === 'visit' && permissions.includes('visit.view')) {
    return (
      <Link to="/office/visits/$transactionId" params={{ transactionId: document.id }} className={className}>
        Nota {label}
      </Link>
    )
  }
  if (document.kind === 'stock_request' && permissions.includes('stock_request.view')) {
    return (
      <Link to="/office/inventory/requests" className={className}>
        Permintaan {label}
      </Link>
    )
  }
  if (document.kind === 'goods_receipt' && permissions.includes('inventory.view')) {
    return (
      <Link to="/office/inventory/receipts" className={className}>
        Barang masuk {label}
      </Link>
    )
  }
  if (document.kind === 'return' && permissions.includes('inventory.view')) {
    return (
      <Link to="/office/inventory/returns" className={className}>
        Retur {label}
      </Link>
    )
  }

  return <span className="block text-sm text-muted-foreground">{label}</span>
}
