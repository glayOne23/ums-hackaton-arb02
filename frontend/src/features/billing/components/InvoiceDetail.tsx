import { Link } from '@tanstack/react-router'
import { ChevronLeft, HandCoins, LoaderCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { FieldError } from '@/components/common/FieldError'
import { InvoiceStatusChip } from '@/components/common/InvoiceStatusChip'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { formatCurrency, formatDate, formatNumber, formatTableDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useInvoice, useRecordPayment, useVoidPayment } from '../api'
import type { Invoice, Payment, PaymentMethodValue } from '../types'

/** One invoice: what is owed, its payments, record a payment (TG-02), void a wrong one (KR-06). */
export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const invoice = useInvoice(invoiceId)

  return (
    <section className="flex flex-col gap-5 pb-8">
      <Link to="/office/billing" className="flex items-center gap-1 self-start text-leaf-700">
        <ChevronLeft className="size-5" aria-hidden />
        Tagihan
      </Link>
      {invoice.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : invoice.isError ? (
        <ErrorState message={invoice.error.message} onRetry={() => invoice.refetch()} />
      ) : (
        <Detail invoice={invoice.data} />
      )}
    </section>
  )
}

function Detail({ invoice }: { invoice: Invoice }) {
  const canManage = usePermission('invoice.manage')
  const open = invoice.status.value === 'unpaid' || invoice.status.value === 'partial'

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight wrap-break-word">{invoice.outlet?.name}</h1>
          <p className="text-muted-foreground">
            Tagihan {invoice.number} · {formatTableDate(new Date(invoice.invoice_date))}
            {invoice.sales && ` · ${invoice.sales.name}`}
          </p>
        </div>
        <InvoiceStatusChip status={invoice.status} />
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <dl className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4 text-lg">
          <Row label="Jumlah tagihan" value={formatCurrency(invoice.amount)} />
          <Row label="Sudah dibayar" value={formatCurrency(invoice.paid_amount)} />
          <Row label="Sisa" value={formatCurrency(invoice.owed)} strong />
          <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
            <dt>Jatuh tempo</dt>
            <dd className={cn(invoice.overdue && 'font-semibold text-danger-text')}>
              {formatTableDate(new Date(invoice.due_date))}
              {invoice.overdue && ' (lewat)'}
            </dd>
          </div>
          {invoice.transaction_id && (
            <Link
              to="/office/visits/$transactionId"
              params={{ transactionId: invoice.transaction_id }}
              className="text-base text-leaf-700 underline-offset-4 hover:underline"
            >
              Lihat nota kunjungan
            </Link>
          )}
        </dl>
        {canManage && open && <PaymentForm invoice={invoice} />}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Pembayaran</h2>
        {!invoice.payments?.length ? (
          <p className="text-muted-foreground">Belum ada pembayaran.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoice.payments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} canVoid={canManage} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function PaymentForm({ invoice }: { invoice: Invoice }) {
  const record = useRecordPayment(invoice.id)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethodValue>('cash')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const id = useId()
  const value = Number(amount.replace(/\D/g, '') || 0)
  const fieldErrors = record.error instanceof ApiError ? record.error.fieldErrors : {}

  const submit = () =>
    record.mutate(
      { amount: value, method, paid_at: date || undefined, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Pembayaran ${formatCurrency(value)} tercatat`)
          setAmount('')
          setNote('')
        },
      },
    )

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2 className="text-lg font-semibold">Catat pembayaran</h2>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-amount`}>Jumlah (wajib)</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-amount`}
            inputMode="numeric"
            placeholder="0"
            value={amount ? formatNumber(value) : ''}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(fieldErrors.amount)}
            aria-describedby={`${id}-amount-error`}
          />
          <Button type="button" variant="outline" onClick={() => setAmount(String(Math.round(invoice.owed)))}>
            Lunas
          </Button>
        </div>
        <FieldError id={`${id}-amount-error`} message={fieldErrors.amount?.[0]} />
      </div>
      <div className="flex gap-2" role="radiogroup" aria-label="Cara bayar">
        {(['cash', 'transfer'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={cn('h-11 flex-1 rounded-md border', method === m ? 'choice-on' : 'choice')}
          >
            {m === 'cash' ? 'Tunai' : 'Transfer'}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-date`}>Tanggal bayar (kosong = hari ini)</Label>
        <Input id={`${id}-date`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <FieldError id={`${id}-date-error`} message={fieldErrors.paid_at?.[0]} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-note`}>Catatan</Label>
        <Input
          id={`${id}-note`}
          maxLength={255}
          placeholder="Misalnya: ditagih Pak Budi, 20/11"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {record.error && !fieldErrors.amount && !fieldErrors.paid_at && (
        <p role="alert" className="text-danger-text">
          {record.error.message}
        </p>
      )}
      <Button type="submit" disabled={value <= 0 || record.isPending}>
        {record.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
        Simpan pembayaran
      </Button>
    </form>
  )
}

function PaymentRow({ payment, canVoid }: { payment: Payment; canVoid: boolean }) {
  const voidPayment = useVoidPayment()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const at = new Date(payment.paid_at)

  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card shadow-card p-3',
        payment.is_void && 'opacity-70',
      )}
    >
      <div className="min-w-0">
        <p className={cn('font-semibold tabular-nums', payment.is_void && 'line-through')}>
          {formatCurrency(payment.amount)} · {payment.method.label}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatDate(at)} {formatTime(at)} · {payment.received_by?.name}
          {payment.transaction_id && ' · saat kunjungan'}
          {payment.note && ` · ${payment.note}`}
        </p>
        {payment.is_void && (
          <p className="text-sm text-danger-text">
            Dibatalkan{payment.voided_by && ` oleh ${payment.voided_by}`}: {payment.void_reason}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {payment.remitted && (
          <StatusChip variant="success" icon={HandCoins}>
            Sudah disetor
          </StatusChip>
        )}
        {canVoid && !payment.is_void && !payment.remitted && (
          <ConfirmDialog
            open={open}
            onOpenChange={(next) => {
              setOpen(next)
              if (!next) voidPayment.reset()
            }}
            trigger={<Button variant="danger-outline">Batalkan</Button>}
            title={`Batalkan pembayaran ${formatCurrency(payment.amount)}?`}
            description={`Sisa tagihan bertambah ${formatCurrency(payment.amount)}. Catatan pembayaran tetap terlihat, dicoret.`}
            confirmLabel="Batalkan pembayaran"
            pending={voidPayment.isPending}
            error={voidPayment.error?.message}
            onConfirm={() =>
              voidPayment.mutate(
                { id: payment.id, reason },
                {
                  onSuccess: () => {
                    setOpen(false)
                    toast.success('Pembayaran dibatalkan')
                  },
                },
              )
            }
          >
            <Textarea
              aria-label="Alasan pembatalan (wajib)"
              placeholder="Alasan pembatalan (wajib)"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </ConfirmDialog>
        )}
      </div>
    </li>
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
