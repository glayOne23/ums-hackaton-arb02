import { Check, Clock, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatTime } from '@/lib/format'
import { useDecideCorrection } from '../api'
import type { Correction } from '../types'

/**
 * A correction waiting for approval: before → after and the reason, with
 * Setujui / Tolak for an approver who did not ask for it (BPM P10).
 */
export function PendingCorrectionCard({
  correction: c,
  showNota = false,
}: {
  correction: Correction
  showNota?: boolean
}) {
  const decide = useDecideCorrection()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const at = new Date(c.created_at)

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-warning-text/30 bg-warning-soft p-4">
      <p className="flex items-center gap-2 font-semibold text-warning-text">
        <Clock className="size-5 shrink-0" aria-hidden />
        {c.kind.label} menunggu persetujuan
      </p>
      {showNota && (
        <p className="font-medium wrap-break-word">
          Nota {c.transaction.number} · {c.transaction.outlet} · {c.transaction.sales}
        </p>
      )}
      <p className="text-sm">
        Diajukan {c.requested_by} · {formatDate(at)} {formatTime(at)}
      </p>
      {c.changes.length > 0 && (
        <ul className="list-disc pl-6">
          {c.changes.map((line) => (
            <li key={line} className="wrap-break-word">
              {line}
            </li>
          ))}
        </ul>
      )}
      {c.kind.value === 'void' && <p>Nota dibatalkan; stok dan tagihannya dibalik.</p>}
      <p className="wrap-break-word">Alasan: {c.reason}</p>

      {c.may_decide && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            disabled={decide.isPending}
            onClick={() =>
              decide.mutate(
                { id: c.id, decision: 'approve' },
                {
                  onSuccess: () => toast.success(`${c.kind.label} nota ${c.transaction.number} disetujui`),
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
            title={`Tolak ${c.kind.label.toLowerCase()} nota ${c.transaction.number}?`}
            description="Nota tetap seperti sekarang. Pengaju melihat catatan Anda di riwayat nota."
            confirmLabel="Tolak"
            pending={decide.isPending}
            error={decide.error?.message}
            onConfirm={() =>
              decide.mutate(
                { id: c.id, decision: 'reject', note },
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
        </div>
      )}
    </article>
  )
}
