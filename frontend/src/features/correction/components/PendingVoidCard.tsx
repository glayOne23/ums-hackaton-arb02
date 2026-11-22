import { useRouter } from '@tanstack/react-router'
import { Check, ChevronRight, Clock, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatTime } from '@/lib/format'
import { useDecideVoid } from '../api'
import type { VoidRequestItem } from '../types'

/**
 * PG-12: a void of a payment, goods in, or return asked after the direct-fix
 * window. Approving voids it now (stock and invoice are reversed); rejecting
 * keeps it as it is, with a note for the person who asked.
 */
export function PendingVoidCard({ request: r }: { request: VoidRequestItem }) {
  const decide = useDecideVoid()
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const at = new Date(r.requested_at)

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-warning-text/30 bg-warning-soft p-4">
      <p className="flex items-center gap-2 font-semibold text-warning-text">
        <Clock className="size-5 shrink-0" aria-hidden />
        Pembatalan {r.type_label.toLowerCase()} menunggu persetujuan
      </p>
      <p className="font-medium wrap-break-word">{r.label}</p>
      <p className="text-sm">
        Diajukan {r.requested_by} · {formatDate(at)} {formatTime(at)}
      </p>
      <p className="wrap-break-word">Alasan: {r.reason}</p>
      <p className="text-sm">
        {r.type === 'payment'
          ? 'Bila disetujui, pembayaran dicoret dan sisa tagihan bertambah lagi.'
          : 'Bila disetujui, dokumen dicoret dan stoknya dibalik.'}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          disabled={decide.isPending}
          onClick={() =>
            decide.mutate(
              { id: r.id, decision: 'approve' },
              {
                onSuccess: () => toast.success(`${r.label} dibatalkan`),
                onError: (error) => toast.error(error.message),
              },
            )
          }
        >
          <Check aria-hidden />
          Setujui
        </Button>
        <ConfirmDialog
          open={rejecting}
          onOpenChange={(next) => {
            setRejecting(next)
            if (!next) decide.reset()
          }}
          trigger={
            <Button variant="danger-outline">
              <X aria-hidden />
              Tolak
            </Button>
          }
          title={`Tolak pembatalan ${r.label}?`}
          description="Dokumen tetap seperti sekarang. Pengaju menerima catatan Anda lewat notifikasi."
          confirmLabel="Tolak"
          pending={decide.isPending}
          error={decide.error?.message}
          onConfirm={() =>
            decide.mutate(
              { id: r.id, decision: 'reject', note },
              {
                onSuccess: () => {
                  setRejecting(false)
                  toast.success('Pengajuan ditolak')
                },
              },
            )
          }
        >
          <Textarea
            aria-label="Catatan untuk pengaju (wajib)"
            placeholder="Catatan untuk pengaju (wajib)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </ConfirmDialog>
        <Button variant="secondary" onClick={() => router.history.push(r.url)}>
          Buka dokumen
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </article>
  )
}
