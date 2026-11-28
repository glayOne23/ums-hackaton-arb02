import { format, subDays } from 'date-fns'
import { ArrowLeft, BadgeCheck, Printer } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatExpiry, formatNumber, formatTableDate, formatTime } from '@/lib/format'
import { useStockCard } from '../api'

/** GD-07 — stock card of one product at the warehouse, with running balance. */
export function StockCardView({ productId }: { productId: string }) {
  const [range, setRange] = useState(() => ({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }))
  const card = useStockCard(productId, range.from, range.to)
  // 50 rows a screen; printing shows the whole card
  const paged = usePagedItems(card.data?.data, 50)
  const start = (paged.meta.current_page - 1) * 50
  const onPage = (i: number) => i >= start && i < start + 50

  return (
    <section className="flex flex-col gap-5">
      <Link to="/office/inventory" className="flex w-fit items-center gap-2 font-medium text-leaf-700 print:hidden">
        <ArrowLeft className="size-5" aria-hidden />
        Stok gudang
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Kartu stok{card.data ? ` ${card.data.product.name}` : ''}
          </h1>
          {card.data && (
            <p className="text-muted-foreground">
              {card.data.product.code} · gudang · {formatTableDate(new Date(card.data.from))} –{' '}
              {formatTableDate(new Date(card.data.to))}
            </p>
          )}
        </div>
        <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
          <Printer aria-hidden />
          Cetak
        </Button>
      </header>

      <div className="grid max-w-md grid-cols-2 gap-3 print:hidden">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-from">Dari</Label>
          <Input
            id="card-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="card-to">Sampai</Label>
          <Input
            id="card-to"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
      </div>

      {card.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : card.isError ? (
        <ErrorState message={card.error.message} onRetry={() => card.refetch()} />
      ) : (
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
                <th scope="col" className="h-11 px-3 text-right font-semibold sm:px-4">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border bg-earth-50">
                <th scope="row" colSpan={4} className="px-3 py-2 text-left font-semibold sm:px-4">
                  Saldo awal
                </th>
                <td className="px-3 py-2 text-right font-semibold tabular-nums sm:px-4">
                  {formatNumber(card.data.opening)}
                </td>
              </tr>
              {card.data.data.length === 0 && (
                <tr className="border-t border-border">
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    Tidak ada keluar-masuk pada rentang tanggal ini.
                  </td>
                </tr>
              )}
              {card.data.data.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn('border-t border-border align-top', !onPage(i) && 'hidden print:table-row')}
                >
                  <td className="px-3 py-2 sm:px-4">
                    <span className="block font-medium">{row.type.label}</span>
                    {row.basis.value === 'confirmed' && (
                      <span className="inline-flex items-center gap-1 text-sm text-success-text">
                        <BadgeCheck className="size-4" aria-hidden />
                        Batch dipastikan
                      </span>
                    )}
                    <span className="block text-sm text-muted-foreground">
                      {formatTableDate(new Date(row.at))} {formatTime(new Date(row.at))}
                      {row.document && ` · ${row.document}`}
                      {row.counterpart && ` · ${row.counterpart}`}
                    </span>
                    <span className="block text-sm text-muted-foreground md:hidden">
                      {row.batch_number} · {formatExpiry(new Date(row.expiry_date))}
                    </span>
                    {row.note && <span className="block text-sm text-muted-foreground">Catatan: {row.note}</span>}
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    {row.batch_number}
                    <span className="block text-sm text-muted-foreground">
                      {formatExpiry(new Date(row.expiry_date))}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">{row.in ? formatNumber(row.in) : ''}</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">{row.out ? formatNumber(row.out) : ''}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums sm:px-4">
                    {formatNumber(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={paged.meta}
            onPageChange={paged.setPage}
            noun="baris"
            className="rounded-none border-0 border-t shadow-none print:hidden"
          />
        </div>
      )}
    </section>
  )
}
