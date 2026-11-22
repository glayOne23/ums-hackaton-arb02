import { Hourglass } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import { formatDate } from '@/lib/format'
import type { VoidPendingInfo } from '@/lib/void-request'

/** PG-12: shown on a document whose void waits for approval. */
export function VoidPendingNote({ pending }: { pending: VoidPendingInfo }) {
  return (
    <div className="flex flex-col gap-1">
      <StatusChip variant="info" icon={Hourglass} className="self-start">
        Pembatalan menunggu persetujuan
      </StatusChip>
      <p className="text-sm text-muted-foreground">
        Diajukan {pending.requested_by}, {formatDate(new Date(pending.requested_at))}: {pending.reason}
      </p>
    </div>
  )
}
