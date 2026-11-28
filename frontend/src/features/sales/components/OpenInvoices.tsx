import { CircleAlert, Clock, Wallet } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PackageOutlet } from '../types'

/**
 * What the outlet still owes, shown first on the visit screen: the sales
 * collects it on any visit, also when nothing was sold. The money paid
 * settles the oldest nota first, as the server does.
 */
export function OpenInvoices({ outlet, onCollect }: { outlet: PackageOutlet; onCollect: () => void }) {
  if (outlet.unpaid <= 0) return null
  const invoices = outlet.invoices ?? []

  return (
    <section
      aria-labelledby="open-invoices-title"
      className="flex flex-col gap-3 rounded-lg border border-warning-text/30 bg-warning-soft p-4 text-warning-text"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="open-invoices-title" className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="size-5 shrink-0" aria-hidden />
          Tagihan belum lunas
        </h2>
        <p className="text-xl font-bold tabular-nums">{formatCurrency(outlet.unpaid)}</p>
      </div>

      {invoices.length > 0 && (
        <ul className="flex flex-col divide-y divide-warning-text/20 rounded-md bg-card text-foreground">
          {invoices.map((invoice) => (
            <li key={invoice.number} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
              <span className="min-w-0">
                <span className="block font-medium wrap-break-word">{invoice.number}</span>
                <span className="block text-sm text-muted-foreground">
                  {invoice.pending
                    ? 'Kunjungan di HP ini, belum terkirim'
                    : `${formatDate(new Date(invoice.invoice_date))} · jatuh tempo ${formatDate(new Date(invoice.due_date))}`}
                </span>
              </span>
              <span className="ml-auto flex items-center gap-2">
                {invoice.overdue && (
                  <StatusChip variant="danger" icon={CircleAlert}>
                    Lewat jatuh tempo
                  </StatusChip>
                )}
                {invoice.pending && (
                  <StatusChip variant="neutral" icon={Clock}>
                    Belum terkirim
                  </StatusChip>
                )}
                <span className="font-semibold tabular-nums">{formatCurrency(invoice.owed)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="lg" className="h-12 bg-card text-base text-foreground" onClick={onCollect}>
        <Wallet aria-hidden />
        Catat pembayaran tagihan
      </Button>
      <p className="text-sm">Uang yang dibayar melunasi nota paling lama lebih dulu.</p>
    </section>
  )
}
