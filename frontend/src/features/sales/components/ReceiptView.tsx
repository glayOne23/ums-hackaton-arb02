import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CircleCheck,
  CloudOff,
  LoaderCircle,
  MessageCircle,
  PencilLine,
  Printer,
  RotateCw,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { whatsappLink } from '@/lib/whatsapp'
import { useReceipt } from '../api'
import type { Receipt } from '../offline/db'
import { retryReceipt } from '../offline/sync'
import { owedAfter, receiptText } from '../receipt'

/** M4 — Nota (KS-09): saved on the phone at once; the number arrives once sent. */
export function ReceiptView({ clientUuid }: { clientUuid: string }) {
  const receipt = useReceipt(clientUuid)

  if (receipt === undefined)
    return <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (receipt === null) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-lg">Nota ini tidak ada di HP ini.</p>
        <Button asChild variant="outline">
          <Link to="/field">Kembali ke daftar outlet</Link>
        </Button>
      </div>
    )
  }

  return <ReceiptCard receipt={receipt} />
}

function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const at = new Date(receipt.created_at)
  const shownLines = receipt.lines.filter((l) => l.sold > 0 || l.withdrawn > 0 || l.refill > 0 || l.closing !== null)
  const message = encodeURIComponent(receiptText(receipt))
  const wa = receipt.outlet.whatsapp_number
    ? `${whatsappLink(receipt.outlet.whatsapp_number)}?text=${message}`
    : `https://wa.me/?text=${message}`

  return (
    <section className="flex flex-col gap-4 pb-24">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4 print:border-0">
        {/* Printed nota header (PG-09) */}
        {receipt.company && (
          <div className="hidden print:block">
            <p className="text-lg font-bold">{receipt.company.name}</p>
            {receipt.company.address && <p>{receipt.company.address}</p>}
            {receipt.company.whatsapp && <p>WA {receipt.company.whatsapp}</p>}
          </div>
        )}
        <p className="flex items-center gap-2 text-xl font-semibold text-success-text">
          <CircleCheck className="size-7" aria-hidden />
          Tersimpan
        </p>
        <SendStatus receipt={receipt} />
        <div>
          <p className="text-lg font-semibold">
            Nota {receipt.transaction?.number ?? <span className="text-muted-foreground">(nomor menyusul)</span>}
          </p>
          <p className="text-muted-foreground">
            {receipt.outlet.name} · {formatDate(at)} {formatTime(at)}
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {shownLines.length === 0 && <li className="py-2">Tidak ada yang laku</li>}
          {shownLines.map((line) => (
            <li key={line.productId} className="flex flex-wrap justify-between gap-x-3 py-2">
              <span>{line.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {[
                  line.sold > 0 && `laku ${line.sold}`,
                  line.withdrawn > 0 && `tarik ${line.withdrawn}`,
                  line.refill > 0 && `isi ${line.refill}`,
                  line.closing !== null && `stok ${line.closing}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-1 text-lg">
          <Row label="Tagihan nota ini" value={formatCurrency(receipt.total)} />
          {receipt.previous_unpaid > 0 && (
            <Row label="Belum dibayar sebelumnya" value={formatCurrency(receipt.previous_unpaid)} />
          )}
          <Row label="Dibayar" value={formatCurrency(receipt.paid)} strong />
          <Row label="Sisa belum dibayar" value={formatCurrency(owedAfter(receipt))} />
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-2 print:hidden">
        <Button asChild variant="outline" size="lg">
          <a href={wa} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
            Kirim ke WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          <Printer aria-hidden />
          Cetak
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-xl border-t border-border bg-card p-3 print:hidden">
        <Button asChild size="cta">
          <Link to="/field">Ke outlet berikutnya</Link>
        </Button>
      </div>
    </section>
  )
}

function SendStatus({ receipt }: { receipt: Receipt }) {
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(false)

  if (receipt.status === 'queued') {
    return (
      <StatusChip variant="info" icon={CloudOff} className="self-start whitespace-normal">
        Tersimpan di HP, akan terkirim saat ada sinyal
      </StatusChip>
    )
  }
  if (receipt.status === 'failed') {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-danger-soft p-3 text-danger-text" role="alert">
        <p className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          Gagal terkirim: {receipt.error}
        </p>
        <Button
          variant="danger-outline"
          className="self-start"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true)
            await retryReceipt(queryClient, receipt).finally(() => setRetrying(false))
          }}
        >
          {retrying ? <LoaderCircle className="animate-spin" aria-hidden /> : <RotateCw aria-hidden />}
          Kirim ulang
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <StatusChip variant="success" icon={CircleCheck} className="self-start">
        Terkirim
      </StatusChip>
      {receipt.transaction?.needs_review && (
        <p className="text-muted-foreground">Angka di server berbeda dengan di HP. Admin akan mengecek.</p>
      )}
      {receipt.photo_status === 'queued' && <p className="text-muted-foreground">Foto form menunggu sinyal.</p>}
      {receipt.transaction && (
        <p className="flex flex-wrap items-center gap-x-2 print:hidden">
          Salah input?
          <Button asChild variant="ghost" className="text-leaf-700">
            <Link to="/field/fix/$transactionId" params={{ transactionId: receipt.transaction.id }}>
              <PencilLine aria-hidden />
              Perbaiki
            </Link>
          </Button>
        </p>
      )}
    </div>
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
