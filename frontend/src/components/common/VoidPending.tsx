import { Hourglass } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import { formatDate } from '@/lib/format'
import type { VoidPendingInfo } from '@/lib/void-request'
import { t } from '@/i18n'

/** PG-12: shown on a document whose void waits for approval. */
export function VoidPendingNote({ pending }: { pending: VoidPendingInfo }) {
  return (
    <div className="flex flex-col gap-1">
      <StatusChip variant="info" icon={Hourglass} className="self-start">
        {t('voids.pendingChip')}
      </StatusChip>
      <p className="text-sm text-muted-foreground">
        {t('voids.requested', {
          by: pending.requested_by,
          date: formatDate(new Date(pending.requested_at)),
          reason: pending.reason,
        })}
      </p>
    </div>
  )
}
