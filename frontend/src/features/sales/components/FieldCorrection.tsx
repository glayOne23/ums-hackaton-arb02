import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, CloudOff } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { CorrectionPanel } from '@/features/correction/components/CorrectionPanel'
import type { Correction } from '@/features/correction/types'
import { api } from '@/lib/api/client'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useTransaction } from '../api'
import { salesDb, type ReceiptLine } from '../offline/db'
import type { Transaction } from '../types'

/**
 * KR-01 on the phone: the sales fixes their own nota the same day (BPM P10
 * "salah ketik sisa"). It needs a signal, because stock and the invoice
 * change on the server. Afterwards the nota on the phone shows the new
 * numbers, ready to send to the outlet's WhatsApp again.
 */
export function FieldCorrection({ transactionId }: { transactionId: string }) {
  const online = useOnlineStatus()
  const transaction = useTransaction(transactionId)
  const navigate = useNavigate()

  const corrected = async (correction: Correction) => {
    if (correction.status.value !== 'applied') return
    const clientUuid = await updateReceipt(transactionId, correction)
    if (clientUuid) await navigate({ to: '/field/receipt/$clientUuid', params: { clientUuid } })
  }

  return (
    <section className="flex flex-col gap-4 pb-24">
      <Link to="/field/today" className="flex items-center gap-1 self-start text-leaf-700">
        <ChevronLeft className="size-5" aria-hidden />
        Hari ini
      </Link>
      {!online && (
        <p className="flex items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-info-text" role="status">
          <CloudOff className="size-5 shrink-0" aria-hidden />
          Perbaikan nota perlu sinyal. Coba lagi saat sinyal kembali.
        </p>
      )}
      {transaction.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : transaction.isError ? (
        <ErrorState message={transaction.error.message} onRetry={() => transaction.refetch()} />
      ) : (
        <>
          <Summary transaction={transaction.data} />
          <CorrectionPanel key={transaction.data.id} transaction={transaction.data} onCorrected={corrected} />
          {transaction.data.correction && !transaction.data.correction.may_change && (
            <p className="text-muted-foreground">Nota ini tidak bisa diperbaiki dari HP. Hubungi admin kantor.</p>
          )}
          <Button asChild variant="outline">
            <Link to="/field/today">Kembali</Link>
          </Button>
        </>
      )}
    </section>
  )
}

function Summary({ transaction: t }: { transaction: Transaction }) {
  const at = new Date(t.transacted_at)
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
      <h1 className="text-xl font-bold tracking-tight wrap-break-word">Nota {t.number}</h1>
      <p className="text-muted-foreground">
        {t.outlet?.name} · {formatDate(at)} {formatTime(at)}
      </p>
      <ul className="flex flex-col divide-y divide-earth-200 border-y border-earth-200">
        {t.items?.map((item) => (
          <li key={item.id} className="flex flex-wrap justify-between gap-x-3 py-2">
            <span>{item.product_name}</span>
            <span className="text-muted-foreground tabular-nums">
              {t.type.value === 'consignment_visit'
                ? `sisa ${item.remaining_qty} · laku ${item.sold_qty} · tarik ${item.withdrawn_qty} · isi ${item.refill_qty}`
                : `beli ${item.sold_qty}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-lg">
        Tagihan nota ini <span className="font-semibold tabular-nums">{formatCurrency(t.total)}</span>
      </p>
    </div>
  )
}

/** The phone's copy of the nota takes the replacement's numbers; returns its client_uuid. */
async function updateReceipt(oldId: string, correction: Correction): Promise<string | null> {
  const receipt = await salesDb.receipts.filter((r) => r.transaction?.id === oldId).first()
  if (!receipt || !correction.replacement_id) return null

  const { data: replacement } = await api<{ data: Transaction }>(`/sales/transactions/${correction.replacement_id}`)
  const lines: ReceiptLine[] = (replacement.items ?? []).map((item) => ({
    productId: item.product_id,
    name: item.product_name,
    sold: item.sold_qty,
    withdrawn: item.withdrawn_qty,
    refill: item.refill_qty,
    closing: item.closing_qty,
    price: item.sold_qty > 0 ? item.line_total / item.sold_qty : item.unit_price * (1 - item.discount_percent / 100),
    total: item.line_total,
  }))
  await salesDb.receipts.update(receipt.client_uuid, { transaction: replacement, lines, total: replacement.total })

  return receipt.client_uuid
}
