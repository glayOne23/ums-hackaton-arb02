import { Link } from '@tanstack/react-router'
import { Ban, PackagePlus, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { Pagination } from '@/components/common/Pagination'
import { VoidPendingNote } from '@/components/common/VoidPending'
import { voidToast } from '@/lib/void-request'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatExpiry, formatNumber, formatTableDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useGoodsReceipts, useVoidGoodsReceipt } from '../api'
import type { GoodsReceipt } from '../types'
import { InventoryTabs } from './InventoryTabs'

/** History of goods in (GD-01). */
export function GoodsReceiptList() {
  const canManage = usePermission('inventory.manage')
  const [page, setPage] = useState(1)
  const receipts = useGoodsReceipts(page)

  return (
    <section className="flex flex-col gap-5 pb-24 sm:pb-0">
      <PageHeader
        icon={PackagePlus}
        title="Barang masuk"
        actions={
          canManage && (
            <Button asChild className="hidden sm:inline-flex">
              <Link to="/office/inventory/receipts/new">
                <Plus aria-hidden />
                Barang masuk
              </Link>
            </Button>
          )
        }
      />
      <InventoryTabs />

      {receipts.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : receipts.isError ? (
        <ErrorState message={receipts.error.message} onRetry={() => receipts.refetch()} />
      ) : receipts.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <PackagePlus className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum ada barang masuk.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {receipts.data.data.map((receipt) => (
              <li
                key={receipt.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-lg font-semibold', receipt.status === 'void' && 'line-through')}>
                      {receipt.number}
                    </span>
                    {receipt.status === 'void' && (
                      <StatusChip variant="danger" icon={Ban}>
                        Dibatalkan
                      </StatusChip>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTableDate(new Date(receipt.received_date))} · {receipt.created_by} ·{' '}
                    {formatNumber(receipt.total_qty)} barang
                  </span>
                </span>
                {receipt.note && <span className="text-sm text-muted-foreground">{receipt.note}</span>}
                {receipt.voided && (
                  <span className="text-sm text-danger-text">
                    Dibatalkan{receipt.voided.by && ` oleh ${receipt.voided.by}`} ·{' '}
                    {formatTableDate(new Date(receipt.voided.at))}: {receipt.voided.reason}. Stoknya sudah dikeluarkan
                    lagi.
                  </span>
                )}
                <ul className={cn('flex flex-col text-sm', receipt.status === 'void' && 'opacity-70')}>
                  {receipt.items.map((item, i) => (
                    <li key={i} className="flex justify-between gap-3 border-t border-border py-1.5">
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
                {receipt.void_pending && <VoidPendingNote pending={receipt.void_pending} />}
                {canManage && receipt.status === 'active' && !receipt.void_pending && (
                  <VoidReceiptButton receipt={receipt} />
                )}
              </li>
            ))}
          </ul>
          <Pagination meta={receipts.data.meta} onPageChange={setPage} noun="catatan" />
        </>
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

/** KR-04 (BPM P10 "Barang masuk salah batch/ED"): void, then enter the right one. */
function VoidReceiptButton({ receipt }: { receipt: GoodsReceipt }) {
  const voidReceipt = useVoidGoodsReceipt()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) voidReceipt.reset()
      }}
      trigger={
        <Button variant="danger-outline" className="self-start">
          Batalkan
        </Button>
      }
      title={`Batalkan barang masuk ${receipt.number}?`}
      description={`${formatNumber(receipt.total_qty)} barang dikeluarkan lagi dari stok gudang. Hanya bisa bila barangnya masih di gudang. Catatan ini tetap terlihat, dicoret. Setelah itu catat barang masuk yang benar.`}
      confirmLabel="Batalkan barang masuk"
      pending={voidReceipt.isPending}
      error={voidReceipt.error?.message}
      onConfirm={() =>
        voidReceipt.mutate(
          { id: receipt.id, reason },
          {
            onSuccess: (result) => {
              setOpen(false)
              toast.success(voidToast(result, `${receipt.number} dibatalkan`))
            },
          },
        )
      }
    >
      <Textarea
        aria-label="Alasan (wajib)"
        placeholder="Alasan (wajib), misalnya: ED salah ketik"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmDialog>
  )
}
