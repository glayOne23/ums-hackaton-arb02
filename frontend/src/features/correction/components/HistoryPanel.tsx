import { History } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { useHistory } from '../api'
import type { HistoryType } from '../types'

/**
 * W12 / KR-10 "Riwayat": who changed this record, when, before → after, and
 * why. Closed until asked for, so the page stays light.
 */
export function HistoryPanel({
  type,
  id,
  defaultOpen = false,
}: {
  type: HistoryType
  id: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const history = useHistory(type, id, open)

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <Button
        variant="ghost"
        className="self-start text-leaf-700"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <History aria-hidden />
        Riwayat perubahan
      </Button>
      {open &&
        (history.isPending ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        ) : history.isError ? (
          <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
        ) : history.data.length === 0 ? (
          <p className="text-muted-foreground">Belum ada perubahan sejak dicatat.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {history.data.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 p-3">
                <span className="text-sm text-muted-foreground tabular-nums">
                  {entry.at && `${formatDate(new Date(entry.at))} ${formatTime(new Date(entry.at))}`} ·{' '}
                  {entry.by ?? 'Sistem'}
                </span>
                <span className="font-medium">{entry.title}</span>
                {entry.changes.map((line) => (
                  <span key={line} className="wrap-break-word">
                    {line}
                  </span>
                ))}
                {entry.reason && <span className="text-muted-foreground wrap-break-word">Alasan: {entry.reason}</span>}
              </li>
            ))}
          </ol>
        ))}
    </div>
  )
}
