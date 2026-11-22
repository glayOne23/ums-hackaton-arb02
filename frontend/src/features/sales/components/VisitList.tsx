import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, CircleAlert, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { InvoiceStatusChip } from '@/components/common/InvoiceStatusChip'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatTableDate, formatTime } from '@/lib/format'
import { useTransactions } from '../api'

/** Office: every visit and direct sale, newest first; "Perlu dicek" shows offline conflicts (KR-11). */
export function VisitList() {
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [needsReview, setNeedsReview] = useState(false)
  const list = useTransactions({ page, from, to, needs_review: needsReview })

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Kunjungan & penjualan</h1>
        <p className="text-muted-foreground">Nota dari HP sales. Angka sudah dihitung ulang oleh server.</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="visit-from">Dari tanggal</Label>
          <Input id="visit-from" type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="visit-to">Sampai tanggal</Label>
          <Input id="visit-to" type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} />
        </div>
        <Button
          variant={needsReview ? 'default' : 'outline'}
          aria-pressed={needsReview}
          onClick={() => (setNeedsReview((v) => !v), setPage(1))}
        >
          <CircleAlert aria-hidden />
          Perlu dicek saja
        </Button>
      </div>

      {list.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : list.isError ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : list.data.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <ClipboardList className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum ada kunjungan di saringan ini.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {list.data.data.map((t) => (
              <li key={t.id}>
                <Link
                  to="/office/visits/$transactionId"
                  params={{ transactionId: t.id }}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4 hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold wrap-break-word">{t.outlet?.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {t.number} · {formatTableDate(new Date(t.transacted_at))} {formatTime(new Date(t.transacted_at))}{' '}
                      · {t.sales?.name} · {t.type.label}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="font-semibold tabular-nums">
                      Laku {t.sold_qty} · {formatCurrency(t.total)}
                    </span>
                    {t.invoice && <InvoiceStatusChip status={t.invoice.status} />}
                    {t.needs_review && (
                      <StatusChip variant="warning" icon={CircleAlert}>
                        Perlu dicek
                      </StatusChip>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft aria-hidden />
              Sebelumnya
            </Button>
            <span className="text-muted-foreground">
              Halaman {list.data.meta.current_page} dari {list.data.meta.last_page}
            </span>
            <Button variant="outline" disabled={page >= list.data.meta.last_page} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
              <ChevronRight aria-hidden />
            </Button>
          </nav>
        </>
      )}
    </section>
  )
}
