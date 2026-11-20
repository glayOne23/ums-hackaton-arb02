import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { CircleCheck, CloudOff, TriangleAlert } from 'lucide-react'
import { StatusChip } from '@/components/common/StatusChip'
import { formatCurrency, formatDate, formatTime } from '@/lib/format'
import { useReceipts, useWorkPackage } from '../api'
import { isDue } from '../calc'

/** M6 top (KS-13): outlets visited today against the plan, and money carried. */
export function TodaySummary() {
  const pkg = useWorkPackage()
  const receipts = useReceipts() ?? []
  const [now] = useState(() => new Date())
  const today = now.toDateString()
  const todays = receipts.filter((r) => new Date(r.created_at).toDateString() === today)

  if (!pkg.data) return null
  const visited = new Set(pkg.data.today.visited_outlet_ids)
  const planned = pkg.data.outlets.filter((o) => visited.has(o.id) || isDue(o)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">Hari ini · {formatDate(now)}</h1>
        <p className="flex justify-between text-lg">
          <span>Dikunjungi</span>
          <span className="font-semibold tabular-nums">
            {visited.size} / rencana {planned}
          </span>
        </p>
        <p className="flex justify-between text-lg">
          <span>Uang dibawa (tunai)</span>
          <span className="font-semibold tabular-nums">{formatCurrency(pkg.data.today.cash)}</span>
        </p>
        {pkg.data.today.transfer > 0 && (
          <p className="flex justify-between text-muted-foreground">
            <span>Transfer</span>
            <span className="tabular-nums">{formatCurrency(pkg.data.today.transfer)}</span>
          </p>
        )}
      </div>

      {todays.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Nota hari ini</h2>
          <ul className="flex flex-col gap-2">
            {todays.map((r) => (
              <li key={r.client_uuid}>
                <Link
                  to="/field/receipt/$clientUuid"
                  params={{ clientUuid: r.client_uuid }}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 active:bg-accent"
                >
                  <span className="min-w-0">
                    <span className="block font-medium wrap-break-word">{r.outlet.name}</span>
                    <span className="block text-muted-foreground">
                      {formatTime(new Date(r.created_at))} · {formatCurrency(r.total)}
                    </span>
                  </span>
                  {r.status === 'sent' ? (
                    <StatusChip variant="success" icon={CircleCheck}>
                      Terkirim
                    </StatusChip>
                  ) : r.status === 'failed' ? (
                    <StatusChip variant="danger" icon={TriangleAlert}>
                      Gagal terkirim
                    </StatusChip>
                  ) : (
                    <StatusChip variant="info" icon={CloudOff}>
                      Menunggu sinyal
                    </StatusChip>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
