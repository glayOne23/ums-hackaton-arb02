import { UserRound, UserX } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useOutletSalesSummary } from '../api'
import type { OutletFilters } from '../types'

/**
 * OT-04: how many outlets each sales holds and how many have no sales yet,
 * under the other filters. Tapping a number filters the list to it (tap again: all).
 */
export function OutletSalesSummary({
  filters,
  onChange,
}: {
  filters: OutletFilters
  onChange: (next: OutletFilters) => void
}) {
  const summary = useOutletSalesSummary(filters, filters.status !== 'deleted')
  if (filters.status === 'deleted' || !summary.data) return null

  const pick = (value: string) =>
    onChange({ ...filters, sales_user_id: filters.sales_user_id === value ? undefined : value, page: undefined })

  return (
    <section aria-labelledby="outlet-per-sales" className="flex flex-col gap-2">
      <h2 id="outlet-per-sales" className="text-sm font-semibold text-muted-foreground">
        Outlet per sales · ketuk untuk menyaring
      </h2>
      <ul className="flex flex-wrap gap-2">
        {summary.data.sales.map((person) => (
          <li key={person.id}>
            <SummaryButton
              pressed={filters.sales_user_id === String(person.id)}
              onClick={() => pick(String(person.id))}
              icon={UserRound}
              label={`${person.name}${person.is_active ? '' : ' (nonaktif)'}`}
              count={person.outlet_count}
            />
          </li>
        ))}
        <li>
          <SummaryButton
            pressed={filters.sales_user_id === 'none'}
            onClick={() => pick('none')}
            icon={UserX}
            label="Belum ada sales"
            count={summary.data.without_sales}
            warning={summary.data.without_sales > 0}
          />
        </li>
      </ul>
    </section>
  )
}

function SummaryButton({
  pressed,
  onClick,
  icon: Icon,
  label,
  count,
  warning = false,
}: {
  pressed: boolean
  onClick: () => void
  icon: typeof UserRound
  label: string
  count: number
  warning?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-left transition-colors',
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : warning
            ? 'border-warning bg-warning-soft text-warning-text hover:border-warning-text'
            : 'border-border bg-card hover:border-leaf-600',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{formatNumber(count)}</span>
    </button>
  )
}
