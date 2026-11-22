import { useNavigate } from '@tanstack/react-router'
import { CircleCheck, CircleX, CloudOff, Hourglass } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { useOutletProposals } from '@/features/outlet/api'
import { OutletForm } from '@/features/outlet/components/OutletForm'
import { formatDate } from '@/lib/format'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/**
 * OT-05 on the phone: a sales finds a new shop and proposes it. It becomes an
 * outlet (and appears in "Outlet saya") after the office checks it; the sales
 * sees what became of each proposal below.
 */
export function ProposeOutletView() {
  const online = useOnlineStatus()
  const navigate = useNavigate()

  return (
    <section className="flex flex-col gap-5 pb-24">
      <header>
        <h1 className="text-2xl font-semibold">Usulkan outlet baru</h1>
        <p className="text-muted-foreground">
          Outlet aktif setelah dicek admin kantor, lalu muncul di daftar outlet Anda.
        </p>
      </header>
      {!online && (
        <p className="flex items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-info-text" role="status">
          <CloudOff className="size-5 shrink-0" aria-hidden />
          Mengirim usulan perlu sinyal.
        </p>
      )}
      <OutletForm
        onCancel={() => void navigate({ to: '/field' })}
        onProposed={(p) => {
          toast.success(`Usulan ${p.name} terkirim. Admin akan mengecek.`)
          void navigate({ to: '/field' })
        }}
      />
      <MyProposals />
    </section>
  )
}

function MyProposals() {
  const proposals = useOutletProposals(true)
  if (proposals.isPending) return null
  if (proposals.isError) return <ErrorState message={proposals.error.message} onRetry={() => proposals.refetch()} />
  if (proposals.data.length === 0) return null

  return (
    <section aria-labelledby="my-proposals" className="flex flex-col gap-3">
      <h2 id="my-proposals" className="text-lg font-semibold">
        Usulan saya
      </h2>
      <ul className="flex flex-col divide-y divide-earth-200 rounded-lg border border-border bg-card shadow-card">
        {proposals.data.map((p) => (
          <li key={p.id} className="flex flex-col gap-1 p-3">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-break-word">{p.name}</span>
              {p.status === 'pending' ? (
                <StatusChip variant="info" icon={Hourglass}>
                  Menunggu dicek
                </StatusChip>
              ) : p.status === 'approved' ? (
                <StatusChip variant="success" icon={CircleCheck}>
                  Disetujui
                </StatusChip>
              ) : (
                <StatusChip variant="danger" icon={CircleX}>
                  Ditolak
                </StatusChip>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {p.district} · diusulkan {formatDate(new Date(p.created_at))}
            </span>
            {p.decision_note && <span className="wrap-break-word">Alasan: {p.decision_note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
