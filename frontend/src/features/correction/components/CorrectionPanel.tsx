import { Link, useLocation } from '@tanstack/react-router'
import { Ban, CircleAlert, Info, PencilLine } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { Transaction } from '@/features/sales/types'
import { formatDate, formatTime } from '@/lib/format'
import { useCorrectionPreview, useRequestCorrection } from '../api'
import type { Correction } from '../types'
import { CorrectionForm } from './CorrectionForm'
import { HistoryPanel } from './HistoryPanel'
import { PendingCorrectionCard } from './PendingCorrectionCard'

interface Props {
  transaction: Transaction
  /** Office users may move the nota to another outlet */
  allowOutletChange?: boolean
  /** Open the form at once, prefilled from the phone (from the "Perlu dicek" list) */
  startWithPhone?: boolean
  /** Called with the request once saved (e.g. to update the phone's copy) */
  onCorrected?: (correction: Correction) => void
}

/**
 * W11 on a nota: what happened to it (dikoreksi, dibatalkan, menunggu
 * persetujuan) and the buttons this user may use: Perbaiki / Ajukan
 * koreksi, Batalkan nota, Riwayat.
 */
export function CorrectionPanel({
  transaction: t,
  allowOutletChange = false,
  startWithPhone = false,
  onCorrected,
}: Props) {
  const [editing, setEditing] = useState<'server' | 'phone' | null>(startWithPhone ? 'phone' : null)
  const summary = t.correction
  const active = t.status.value === 'active'

  const done = (correction: Correction) => {
    setEditing(null)
    toast.success(
      correction.status.value === 'pending'
        ? 'Koreksi diajukan, menunggu persetujuan'
        : correction.kind.value === 'void'
          ? 'Nota dibatalkan'
          : 'Nota diperbaiki',
    )
    onCorrected?.(correction)
  }

  return (
    <div className="flex flex-col gap-3 print:hidden">
      {t.status.value === 'void' && t.voided && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-4 text-danger-text" role="note">
          <Ban className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Nota ini dibatalkan
            {t.voided.by && ` oleh ${t.voided.by}`} · {formatDate(new Date(t.voided.at))}{' '}
            {formatTime(new Date(t.voided.at))}
            {t.voided.reason && `. Alasan: ${t.voided.reason}`}. Stok dan tagihannya sudah dibalik.
          </span>
        </p>
      )}
      {t.status.value === 'corrected' && (
        <p className="flex items-start gap-2 rounded-lg bg-info-soft p-4 text-info-text" role="note">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Nota ini sudah dikoreksi dan tidak dihitung lagi.{' '}
            {t.replaced_by && <NotaLink id={t.replaced_by.id}>Lihat nota pengganti {t.replaced_by.number}</NotaLink>}
          </span>
        </p>
      )}
      {t.corrects && (
        <p className="flex items-start gap-2 rounded-lg bg-muted p-4" role="note">
          <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            Nota ini mengganti <NotaLink id={t.corrects.id}>{t.corrects.number}</NotaLink> yang dikoreksi.
          </span>
        </p>
      )}

      {summary?.pending && <PendingCorrectionCard correction={summary.pending} />}

      {active && summary?.may_change && (
        <div className="flex flex-col gap-2">
          {summary.blocked ? (
            !summary.pending && (
              <p className="flex items-start gap-2 text-muted-foreground">
                <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                {summary.blocked}
              </p>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditing('server')}>
                <PencilLine aria-hidden />
                {summary.direct ? 'Perbaiki' : 'Ajukan koreksi'}
              </Button>
              {t.client_items && t.client_items.length > 0 && (
                <Button variant="outline" onClick={() => setEditing('phone')}>
                  <PencilLine aria-hidden />
                  Perbaiki pakai data HP
                </Button>
              )}
              <VoidButton transaction={t} onDone={done} />
            </div>
          )}
        </div>
      )}

      <HistoryPanel type="transaction" id={t.id} />

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="sm:max-w-2xl">
          <SheetTitle>
            {summary?.direct ? 'Perbaiki' : 'Ajukan koreksi'} nota {t.number}
          </SheetTitle>
          <SheetDescription>
            {t.outlet?.name} · {t.type.label}
          </SheetDescription>
          {editing && (
            <CorrectionForm
              key={editing}
              transaction={t}
              fromPhone={editing === 'phone'}
              allowOutletChange={allowOutletChange}
              onDone={done}
              onCancel={() => setEditing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function VoidButton({ transaction: t, onDone }: { transaction: Transaction; onDone: (c: Correction) => void }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const request = useRequestCorrection(t.id)
  const preview = useCorrectionPreview(t.id, open ? { kind: 'void' } : null)
  const approval = t.correction?.needs_approval

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) request.reset()
      }}
      trigger={
        <Button variant="danger-outline">
          <Ban aria-hidden />
          Batalkan nota
        </Button>
      }
      title={`Batalkan nota ${t.number}?`}
      description={
        <>
          Nota tetap terlihat, dicoret. {approval ? 'Pembatalan berlaku setelah disetujui. ' : ''}
          {preview.isError
            ? preview.error.message
            : preview.data
              ? preview.data.lines.join('. ') || 'Stok dan tagihan tidak berubah.'
              : 'Menghitung dampaknya…'}
        </>
      }
      confirmLabel={approval ? 'Ajukan pembatalan' : 'Batalkan nota'}
      pending={request.isPending}
      error={request.error?.message}
      onConfirm={() =>
        request.mutate(
          { kind: 'void', reason },
          {
            onSuccess: (correction) => {
              setOpen(false)
              onDone(correction)
            },
          },
        )
      }
    >
      <Textarea
        aria-label="Alasan pembatalan (wajib)"
        placeholder="Alasan pembatalan (wajib), misalnya: kunjungan tercatat dua kali"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmDialog>
  )
}

/** Notas open in the office or on the phone, whichever area this is. */
function NotaLink({ id, children }: { id: string; children: ReactNode }) {
  const field = useLocation({ select: (l) => l.pathname.startsWith('/field') })
  return field ? (
    <Link to="/field/fix/$transactionId" params={{ transactionId: id }} className="font-medium underline">
      {children}
    </Link>
  ) : (
    <Link to="/office/visits/$transactionId" params={{ transactionId: id }} className="font-medium underline">
      {children}
    </Link>
  )
}
