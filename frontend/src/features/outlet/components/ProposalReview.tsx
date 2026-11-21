import { Link } from '@tanstack/react-router'
import { Check, CircleAlert, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useDecideProposal, useOutletProposals } from '../api'
import type { OutletProposal } from '../types'

/**
 * OT-05 for the office: outlets proposed by sales, with similar names already
 * in SIGAP (OT-02), to approve (it becomes active, held by that sales) or
 * refuse with a reason. Shown on the outlet list only when there are some.
 */
export function ProposalReview() {
  const canManage = usePermission('outlet.manage')
  const proposals = useOutletProposals(false, canManage)
  if (!canManage || !proposals.data?.length) return null

  return (
    <section
      aria-labelledby="proposals-title"
      className="flex flex-col gap-3 rounded-lg border border-info-text/30 bg-info-soft p-4"
    >
      <h2 id="proposals-title" className="flex items-center gap-2 text-lg font-semibold text-info-text">
        <Lightbulb className="size-5" aria-hidden />
        Usulan outlet dari sales ({proposals.data.length})
      </h2>
      <ul className="flex flex-col gap-3">
        {proposals.data.map((p) => (
          <ProposalCard key={p.id} proposal={p} />
        ))}
      </ul>
    </section>
  )
}

function ProposalCard({ proposal: p }: { proposal: OutletProposal }) {
  const decide = useDecideProposal()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-lg font-semibold wrap-break-word">
          {p.name} <span className="text-base font-normal text-muted-foreground">· {p.code}</span>
        </p>
        <p className="text-muted-foreground">
          {[p.outlet_type, p.district, p.region].filter(Boolean).join(' · ')} · {p.sale_mode.label}
        </p>
        {(p.address || p.whatsapp_number) && (
          <p className="wrap-break-word">
            {[p.address, p.whatsapp_number && `WA ${p.whatsapp_number}`].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Diusulkan {p.proposed_by} · {formatDate(new Date(p.created_at))}
        </p>
        {p.note && <p className="wrap-break-word">Catatan sales: {p.note}</p>}
      </div>
      {p.similar.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-warning-soft px-3 py-2 text-warning-text" role="note">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-5 shrink-0" aria-hidden />
            Nama mirip yang sudah ada di kecamatan ini:
          </p>
          <ul className="list-disc pl-6">
            {p.similar.map((s) => (
              <li key={s.id}>
                <Link to="/office/outlets/$outletId" params={{ outletId: s.id }} className="underline">
                  {s.name} ({s.code})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={decide.isPending}
          onClick={() =>
            decide.mutate(
              { id: p.id, decision: 'approve' },
              {
                onSuccess: () => toast.success(`${p.name} jadi outlet aktif, dipegang ${p.proposed_by}`),
                onError: (e) => toast.error(e.message),
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
          title={`Tolak usulan ${p.name}?`}
          description={`${p.proposed_by} melihat alasan Anda di HP. Usulan ini tidak menjadi outlet.`}
          confirmLabel="Tolak usulan"
          pending={decide.isPending}
          error={decide.error?.message}
          onConfirm={() =>
            decide.mutate(
              { id: p.id, decision: 'reject', note },
              {
                onSuccess: () => {
                  setRejecting(false)
                  toast.success('Usulan ditolak')
                },
              },
            )
          }
        >
          <Textarea
            aria-label="Alasan untuk sales (wajib)"
            placeholder="Alasan untuk sales (wajib), misalnya: sudah ada sebagai Apotek Sari Farma"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </ConfirmDialog>
      </div>
    </li>
  )
}
