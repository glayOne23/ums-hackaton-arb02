import { Link } from '@tanstack/react-router'
import { Ban, Plus, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatNumber, formatTableDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useStockReturns, useVoidStockReturn } from '../api'
import type { StockReturn } from '../types'
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
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <Undo2 className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum ada retur.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {returns.data.data.map((ret) => (
            <li key={ret.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-lg font-semibold', ret.status === 'void' && 'line-through')}>
                    {ret.number} · {ret.sales.name}
                  </span>
                  {ret.status === 'void' && (
                    <StatusChip variant="danger" icon={Ban}>
                      Dibatalkan
                    </StatusChip>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {formatTableDate(new Date(ret.received_date))} · diterima {ret.created_by}
                </span>
              </span>
              {ret.voided && (
                <span className="text-sm text-danger-text">
                  Dibatalkan{ret.voided.by && ` oleh ${ret.voided.by}`} · {formatTableDate(new Date(ret.voided.at))}:{' '}
                  {ret.voided.reason}. Barangnya sudah kembali ke bawaan sales.
                </span>
              )}
              <ul className={cn('flex flex-col text-sm', ret.status === 'void' && 'opacity-70')}>
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
              {canManage && ret.status === 'active' && <VoidReturnButton stockReturn={ret} />}
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

/** KR-04 (BPM P10): a return entered wrongly is voided, then the right one is entered. */
function VoidReturnButton({ stockReturn }: { stockReturn: StockReturn }) {
  const voidReturn = useVoidStockReturn()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const qty = stockReturn.items.reduce((sum, item) => sum + item.qty, 0)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) voidReturn.reset()
      }}
      trigger={
        <Button variant="danger-outline" className="self-start">
          Batalkan
        </Button>
      }
      title={`Batalkan retur ${stockReturn.number}?`}
      description={`${formatNumber(qty)} barang kembali ke bawaan ${stockReturn.sales.name}. Hanya bisa bila barangnya masih di tempat tujuan retur. Catatan ini tetap terlihat, dicoret. Setelah itu catat retur yang benar.`}
      confirmLabel="Batalkan retur"
      pending={voidReturn.isPending}
      error={voidReturn.error?.message}
      onConfirm={() =>
        voidReturn.mutate(
          { id: stockReturn.id, reason },
          {
            onSuccess: () => {
              setOpen(false)
              toast.success(`${stockReturn.number} dibatalkan`)
            },
          },
        )
      }
    >
      <Textarea
        aria-label="Alasan (wajib)"
        placeholder="Alasan (wajib), misalnya: kondisi salah pilih, harusnya rusak"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmDialog>
  )
}
