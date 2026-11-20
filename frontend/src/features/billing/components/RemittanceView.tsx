import { CircleAlert, CircleCheck, HandCoins, LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { FieldError } from '@/components/common/FieldError'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api/client'
import { formatCurrency, formatDate, formatNumber, formatTableDate, formatTime } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { usePendingRemittances, useReceiveRemittance, useRemittances } from '../api'
import type { PendingRemittance } from '../types'
import { BillingTabs } from './BillingTabs'

/** TG-03: cash each sales still holds; the office marks "Uang diterima", or records a difference. */
export function RemittanceView() {
  const canReceive = usePermission('remittance.receive')
  const pending = usePendingRemittances(canReceive)
  const history = useRemittances()

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Tagihan</h1>
        <p className="text-muted-foreground">Uang tunai yang dibawa sales dari outlet, belum disetor ke kantor.</p>
      </header>
      <BillingTabs />

      {canReceive && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Menunggu disetor</h2>
          {pending.isPending ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ) : pending.isError ? (
            <ErrorState message={pending.error.message} onRetry={() => pending.refetch()} />
          ) : pending.data.length === 0 ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <CircleCheck className="size-5 text-success-text" aria-hidden />
              Semua uang tunai sudah disetor.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {pending.data.map((row) => (
                <PendingCard key={row.sales.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Riwayat setoran</h2>
        {history.isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        ) : history.isError ? (
          <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
        ) : history.data.length === 0 ? (
          <p className="text-muted-foreground">Belum ada setoran.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.data.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.sales?.name} · <span className="tabular-nums">{formatCurrency(r.amount)}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.number} · {formatTableDate(new Date(r.received_at))} {formatTime(new Date(r.received_at))} ·
                    diterima {r.received_by} · {r.payments_count} pembayaran
                  </p>
                  {r.status.value === 'discrepancy' && (
                    <p className="text-sm text-danger-text">
                      Seharusnya {formatCurrency(r.expected_amount)}, selisih {formatCurrency(r.difference)}: {r.note}
                    </p>
                  )}
                </div>
                {r.status.value === 'received' ? (
                  <StatusChip variant="success" icon={CircleCheck}>
                    {r.status.label}
                  </StatusChip>
                ) : (
                  <StatusChip variant="danger" icon={CircleAlert}>
                    {r.status.label}
                  </StatusChip>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function PendingCard({ row }: { row: PendingRemittance }) {
  const receive = useReceiveRemittance()
  const [different, setDifferent] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const id = useId()
  const value = Number(amount.replace(/\D/g, '') || 0)
  const fieldErrors = receive.error instanceof ApiError ? receive.error.fieldErrors : {}

  const done = (received: number) => toast.success(`Setoran ${row.sales.name} ${formatCurrency(received)} diterima`)

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold">{row.sales.name}</p>
          <p className="text-sm text-muted-foreground">
            {row.payments} pembayaran sejak {formatDate(new Date(row.since))}
          </p>
        </div>
        <p className="text-xl font-semibold tabular-nums">{formatCurrency(row.amount)}</p>
      </div>

      {different ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            receive.mutate({ sales_user_id: row.sales.id, amount: value, note }, { onSuccess: (r) => done(r.amount) })
          }}
        >
          <Label htmlFor={`${id}-amount`}>Uang yang diterima</Label>
          <Input
            id={`${id}-amount`}
            inputMode="numeric"
            autoFocus
            value={amount ? formatNumber(value) : ''}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
          />
          {amount !== '' && value !== row.amount && (
            <p className="text-danger-text">Selisih {formatCurrency(value - row.amount)}</p>
          )}
          <Label htmlFor={`${id}-note`}>Keterangan selisih (wajib)</Label>
          <Input
            id={`${id}-note`}
            maxLength={255}
            placeholder="Misalnya: kurang 10 rb, menyusul besok"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${id}-note-error`}
          />
          <FieldError id={`${id}-note-error`} message={fieldErrors.note?.[0]} />
          {receive.error && !fieldErrors.note && (
            <p role="alert" className="text-danger-text">
              {receive.error.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={amount === '' || receive.isPending}>
              {receive.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
              Simpan setoran
            </Button>
            <Button type="button" variant="ghost" onClick={() => (setDifferent(false), receive.reset())}>
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={receive.isPending}
            onClick={() => receive.mutate({ sales_user_id: row.sales.id }, { onSuccess: () => done(row.amount) })}
          >
            {receive.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <HandCoins aria-hidden />}
            Uang diterima
          </Button>
          <Button variant="outline" onClick={() => setDifferent(true)}>
            Jumlahnya beda…
          </Button>
          {receive.error && (
            <p role="alert" className="basis-full text-danger-text">
              {receive.error.message}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
