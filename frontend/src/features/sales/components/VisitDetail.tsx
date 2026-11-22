import { Link } from '@tanstack/react-router'
import { Ban, Check, ChevronLeft, CircleAlert, CircleCheck, History, ImageOff, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { InvoiceStatusChip } from '@/components/common/InvoiceStatusChip'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { useMarkReviewed } from '@/features/correction/api'
import { CorrectionPanel } from '@/features/correction/components/CorrectionPanel'
import { formatCurrency, formatDate, formatDiscountPercent, formatTableDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useTransaction, useTransactionPhoto } from '../api'
import type { Transaction } from '../types'

/**
 * Office view of one nota: shelf numbers per product, bill, payment, form
 * photo, review notes, and the correction buttons (W11) with the history (W12).
 */
export function VisitDetail({ transactionId, fromPhone = false }: { transactionId: string; fromPhone?: boolean }) {
  const transaction = useTransaction(transactionId)

  return (
    <section className="flex flex-col gap-5 pb-8">
      <Link to="/office/visits" className="flex items-center gap-1 self-start text-leaf-700">
        <ChevronLeft className="size-5" aria-hidden />
        Kunjungan & penjualan
      </Link>
      {transaction.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : transaction.isError ? (
        <ErrorState message={transaction.error.message} onRetry={() => transaction.refetch()} />
      ) : (
        <Detail key={transaction.data.id} transaction={transaction.data} fromPhone={fromPhone} />
      )}
    </section>
  )
}

function Detail({ transaction: t, fromPhone }: { transaction: Transaction; fromPhone: boolean }) {
  const consignment = t.type.value === 'consignment_visit'
  const at = new Date(t.transacted_at)
  const struck = t.status.value !== 'active'

  return (
    <>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className={cn('text-2xl font-bold tracking-tight wrap-break-word', struck && 'line-through decoration-2')}
          >
            {t.outlet?.name}
          </h1>
          {t.status.value === 'void' && (
            <StatusChip variant="danger" icon={Ban}>
              {t.status.label}
            </StatusChip>
          )}
          {t.status.value === 'corrected' && (
            <StatusChip variant="neutral" icon={History}>
              {t.status.label}
            </StatusChip>
          )}
        </div>
        <p className="text-muted-foreground">
          Nota {t.number} · {t.type.label} · {formatDate(at)} {formatTime(at)} · {t.sales?.name}
        </p>
      </header>

      {t.needs_review && <ReviewNotice transaction={t} />}
      {!t.needs_review && t.reviewed && t.review_notes.length > 0 && (
        <p className="flex items-start gap-2 text-muted-foreground">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          Sudah dicek{t.reviewed.by && ` oleh ${t.reviewed.by}`} · {formatDate(new Date(t.reviewed.at))}:{' '}
          {t.review_notes.join(' ')}
        </p>
      )}

      <CorrectionPanel transaction={t} allowOutletChange startWithPhone={fromPhone && !!t.client_items?.length} />

      {/* Phones: one card per product, no sideways scrolling (UI guide §5) */}
      <ul
        className={cn(
          'flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card sm:hidden',
          struck && 'opacity-70',
        )}
      >
        {t.items?.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 p-3">
            <span className="flex justify-between gap-3">
              <span className="font-medium">{item.product_name}</span>
              <span className="tabular-nums">{formatCurrency(item.line_total)}</span>
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {consignment
                ? `titipan ${item.opening_qty} · sisa ${item.remaining_qty} · laku ${item.sold_qty} · tarik ${item.withdrawn_qty} · isi ${item.refill_qty} · stok ${item.closing_qty}`
                : `beli ${item.sold_qty}`}{' '}
              × {formatCurrency(item.unit_price)}
              {item.discount_percent > 0 && ` −${formatDiscountPercent(item.discount_percent)}`}
            </span>
          </li>
        ))}
      </ul>

      <div
        className={cn(
          'hidden overflow-x-auto rounded-lg border border-border bg-card shadow-card sm:block',
          struck && 'opacity-70',
        )}
      >
        <table className="w-full text-left">
          <thead className="bg-table-head text-sm text-table-head-foreground print:bg-transparent print:text-foreground">
            <tr>
              <th className="p-3 font-semibold">Produk</th>
              {consignment && <th className="p-3 text-right font-semibold">Titipan</th>}
              {consignment && <th className="p-3 text-right font-semibold">Sisa</th>}
              <th className="p-3 text-right font-semibold">Laku</th>
              {consignment && <th className="p-3 text-right font-semibold">Tarik</th>}
              {consignment && <th className="p-3 text-right font-semibold">Isi</th>}
              {consignment && <th className="p-3 text-right font-semibold">Stok akhir</th>}
              <th className="p-3 text-right font-semibold">Harga</th>
              <th className="p-3 text-right font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {t.items?.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="p-3">{item.product_name}</td>
                {consignment && <td className="p-3 text-right">{item.opening_qty}</td>}
                {consignment && <td className="p-3 text-right">{item.remaining_qty}</td>}
                <td className="p-3 text-right font-semibold">{item.sold_qty}</td>
                {consignment && <td className="p-3 text-right">{item.withdrawn_qty}</td>}
                {consignment && <td className="p-3 text-right">{item.refill_qty}</td>}
                {consignment && <td className="p-3 text-right">{item.closing_qty}</td>}
                <td className="p-3 text-right">
                  {formatCurrency(item.unit_price)}
                  {item.discount_percent > 0 && (
                    <span className="block text-sm text-muted-foreground">
                      −{formatDiscountPercent(item.discount_percent)}
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <dl className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
          <Row label="Harga normal" value={formatCurrency(t.subtotal)} />
          <Row label="Potongan" value={`−${formatCurrency(t.discount_total)}`} />
          <Row label="Total nota" value={formatCurrency(t.total)} strong />
          <Row label="Uang diterima saat kunjungan" value={formatCurrency(t.paid_now ?? 0)} />
          {t.invoice && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <dt>Tagihan {t.invoice.number}</dt>
                <dd>
                  <InvoiceStatusChip status={t.invoice.status} />
                </dd>
              </div>
              <Row label="Jatuh tempo" value={formatTableDate(new Date(t.invoice.due_date))} />
            </>
          )}
        </dl>
        <FormPhoto transaction={t} />
      </div>
    </>
  )
}

/** KR-11: why the nota needs a look, and "Pakai data server" for when the server numbers are right. */
function ReviewNotice({ transaction: t }: { transaction: Transaction }) {
  const review = useMarkReviewed()
  const mayCheck = usePermission('visit.correct')

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-warning-soft p-4 text-warning-text" role="note">
      <p className="flex items-center gap-2 font-semibold">
        <CircleAlert className="size-5" aria-hidden />
        Perlu dicek: angka dari HP berbeda dengan server
      </p>
      <ul className="list-disc pl-6">
        {t.review_notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {mayCheck && t.status.value === 'active' && (
        <div className="flex flex-col gap-2 pt-1 text-foreground">
          <p className="text-sm">
            Angka server sudah benar? Tandai sudah dicek. Angka HP yang benar? Pakai "Perbaiki pakai data HP" di bawah.
          </p>
          <Button
            variant="outline"
            className="self-start"
            disabled={review.isPending}
            onClick={() =>
              review.mutate(t.id, {
                onSuccess: () => toast.success('Ditandai sudah dicek'),
                onError: (error) => toast.error(error.message),
              })
            }
          >
            {review.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Pakai data server, tandai sudah dicek
          </Button>
        </div>
      )}
    </div>
  )
}

function FormPhoto({ transaction }: { transaction: Transaction }) {
  const photo = useTransactionPhoto(transaction.id, transaction.has_photo)

  return (
    <figure className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4">
      <figcaption className="font-semibold">Foto form bercap</figcaption>
      {!transaction.has_photo ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          Tidak ada foto.
        </p>
      ) : photo.data ? (
        <a href={photo.data} target="_blank" rel="noreferrer">
          <img
            src={photo.data}
            alt={`Form kunjungan ${transaction.number}`}
            className="max-h-96 rounded-md object-contain"
          />
        </a>
      ) : (
        <div className="h-48 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      )}
    </figure>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className={strong ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  )
}
