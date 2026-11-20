import { Link } from '@tanstack/react-router'
import { PackagePlus, Plus } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { formatExpiry, formatNumber, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useGoodsReceipts } from '../api'
import { InventoryTabs } from './InventoryTabs'

/** History of goods in (GD-01). */
export function GoodsReceiptList() {
  const canManage = usePermission('inventory.manage')
  const receipts = useGoodsReceipts()

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Barang masuk</h1>
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

      {receipts.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : receipts.isError ? (
        <ErrorState message={receipts.error.message} onRetry={() => receipts.refetch()} />
      ) : receipts.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-12 text-center">
          <PackagePlus className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum ada barang masuk.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {receipts.data.data.map((receipt) => (
            <li key={receipt.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">{receipt.number}</span>
                <span className="text-muted-foreground">
                  {formatTableDate(new Date(receipt.received_date))} · {receipt.created_by} ·{' '}
                  {formatNumber(receipt.total_qty)} barang
                </span>
              </span>
              {receipt.note && <span className="text-sm text-muted-foreground">{receipt.note}</span>}
              <ul className="flex flex-col text-sm">
                {receipt.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3 border-t border-earth-200 py-1.5">
                    <span>
                      {item.product.name}{' '}
                      <span className="text-muted-foreground">
                        · {item.batch_number} · {formatExpiry(new Date(item.expiry_date))}
                      </span>
                    </span>
                    <span className="tabular-nums">{formatNumber(item.qty)}</span>
                  </li>
                ))}
              </ul>
            </li>
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
