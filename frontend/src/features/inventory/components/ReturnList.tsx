import { Link } from '@tanstack/react-router'
import { Plus, Undo2 } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { formatNumber, formatTableDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useStockReturns } from '../api'
import { InventoryTabs } from './InventoryTabs'

/** History of returns from sales (GD-05). */
export function ReturnList() {
  const canManage = usePermission('inventory.manage')
  const returns = useStockReturns()

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Retur dari sales</h1>
        {canManage && (
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/office/inventory/returns/new">
              <Plus aria-hidden />
              Terima retur
            </Link>
          </Button>
        )}
      </header>
      <InventoryTabs />

      {returns.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : returns.isError ? (
        <ErrorState message={returns.error.message} onRetry={() => returns.refetch()} />
      ) : returns.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-12 text-center">
          <Undo2 className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum ada retur.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {returns.data.data.map((ret) => (
            <li key={ret.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-semibold">
                  {ret.number} · {ret.sales.name}
                </span>
                <span className="text-muted-foreground">
                  {formatTableDate(new Date(ret.received_date))} · diterima {ret.created_by}
                </span>
              </span>
              <ul className="flex flex-col text-sm">
                {ret.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3 border-t border-earth-200 py-1.5">
                    <span>
                      {item.product.name} <span className="text-muted-foreground">· {item.batch_number}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      {item.condition.label} · <span className="tabular-nums">{formatNumber(item.qty)}</span>
                    </span>
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
            <Link to="/office/inventory/returns/new">
              <Plus aria-hidden />
              Terima retur
            </Link>
          </Button>
        </div>
      )}
    </section>
  )
}
