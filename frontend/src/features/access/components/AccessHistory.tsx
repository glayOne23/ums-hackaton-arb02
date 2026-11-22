import { History } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Pagination } from '@/components/common/Pagination'
import { usePagedItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/format'
import { useAccessHistory } from '../api'

/** AK-03: who changed which user or role, and what changed. */
export function AccessHistory() {
  const [open, setOpen] = useState(false)
  const history = useAccessHistory(open)
  const paged = usePagedItems(history.data)

  return (
    <div className="flex flex-col gap-2">
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
          <p className="text-muted-foreground">Belum ada perubahan.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
              {paged.items.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 p-3">
                  <span className="font-medium">{entry.title}</span>
                  {entry.changes.map((line) => (
                    <span key={line} className="break-words">
                      {line}
                    </span>
                  ))}
                  <span className="text-sm text-muted-foreground">
                    {entry.by ?? '—'} ·{' '}
                    {entry.at && `${formatDate(new Date(entry.at))} ${formatTime(new Date(entry.at))}`}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination meta={paged.meta} onPageChange={paged.setPage} noun="perubahan" />
          </>
        ))}
    </div>
  )
}
