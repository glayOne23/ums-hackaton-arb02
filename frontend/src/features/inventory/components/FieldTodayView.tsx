import { Link } from '@tanstack/react-router'
import { CalendarCheck, PackageOpen, Truck } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { expirySummary } from '@/lib/expiry'
import { formatNumber, formatTableDate } from '@/lib/format'
import { useSalesStock, useStockRequests } from '../api'
import { StockRequestStatusChip } from './StockRequestStatusChip'

/**
 * M6 — what the sales carries and their requests to the warehouse (GD-02, GD-04).
 * No batch numbers on this screen; expiry is shown as month/year (doc 11).
 */
export function FieldTodayView() {
  const stock = useSalesStock()
  const requests = useStockRequests('all')
  const recent = (requests.data ?? []).slice(0, 5)

  return (
    <section className="flex flex-col gap-6 pb-24">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold tracking-tight">Stok bawaan</h1>
          {stock.data && stock.data.data.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/field/expiry-check">
                <CalendarCheck aria-hidden />
                Cek ED bawaan
              </Link>
            </Button>
          )}
        </div>
        {stock.isPending ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
        ) : stock.isError ? (
          <ErrorState message={stock.error.message} onRetry={() => stock.refetch()} />
        ) : stock.data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-10 text-center">
            <PackageOpen className="size-12 text-muted-foreground" aria-hidden />
            <p className="text-lg">Belum membawa barang.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {stock.data.data.map((row) => (
              <li key={row.product.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-lg">{row.product.name}</span>
                  {/* Doc 11: which ED the pieces have, so the oldest goes on the shelf first */}
                  {row.expiry.length > 0 && <span className="text-sm text-muted-foreground">{expirySummary(row.expiry)}</span>}
                </span>
                {/* Number and unit stay on one line, right-aligned, so the column lines up */}
                <span className="shrink-0 text-right text-xl font-semibold whitespace-nowrap tabular-nums">
                  {formatNumber(row.qty)}{' '}
                  <span className="text-base font-normal text-muted-foreground">{row.product.unit}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Permintaan ke gudang</h2>
        {requests.isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground">Belum ada permintaan.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recent.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{formatTableDate(new Date(request.created_at))}</span>
                  <StockRequestStatusChip status={request.status} />
                </span>
                <ul>
                  {request.items.map((item) => (
                    <li key={item.id} className="flex flex-col">
                      <span className="flex justify-between gap-3">
                        <span>{item.product.name}</span>
                        <span className="tabular-nums">
                          {item.issued_qty !== null && item.issued_qty !== item.requested_qty
                            ? `${item.issued_qty} dari ${item.requested_qty}`
                            : item.requested_qty}
                        </span>
                      </span>
                      {item.expiry.length > 0 && (
                        <span className="text-sm text-muted-foreground">{expirySummary(item.expiry)}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {request.warehouse_note && (
                  <p className="text-sm text-muted-foreground">Gudang: {request.warehouse_note}</p>
                )}
                {request.status.value === 'issued' && (
                  <Button asChild variant="secondary" className="self-start">
                    <Link to="/field/expiry-check" search={{ request: request.id }}>
                      <CalendarCheck aria-hidden />
                      Cocokkan ED
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-xl border-t border-border bg-card p-3">
        <Button asChild size="cta">
          <Link to="/field/request">
            <Truck aria-hidden />
            Minta barang ke gudang
          </Link>
        </Button>
      </div>
    </section>
  )
}
