import { Link } from '@tanstack/react-router'
import {
  Banknote,
  CalendarCheck,
  ChevronRight,
  CircleAlert,
  Clock,
  type LucideIcon,
  PackageMinus,
  Store,
  TrendingDown,
  Wallet,
  LayoutDashboard,
} from 'lucide-react'
import { type ReactNode, useId } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusChip } from '@/components/common/StatusChip'
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useManagerSummary } from '../api'
import { toSearch } from '../search'
import type { ManagerSummary, ReportFilters } from '../types'
import { ReportFilterBar } from './ReportFilterBar'

/**
 * W1 — Ringkasan pimpinan (LP-01): the month in four numbers, then sales
 * performance, the most active outlets, stock turnover, and what needs action.
 * Every number opens the report it comes from.
 */
export function ManagerDashboard({
  filters,
  onFiltersChange,
}: {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
}) {
  const summary = useManagerSummary(filters)
  const canOpenReports = usePermission('report.view')

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        icon={LayoutDashboard}
        title="Ringkasan"
        description={
          <>
            {summary.data?.month_label ?? 'Bulan ini'}
            {summary.isFetching && !summary.isPending && ' · memperbarui…'}
          </>
        }
      />

      <ReportFilterBar filters={filters} show={['month', 'sales', 'region']} onChange={onFiltersChange} />

      {summary.isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : summary.isError ? (
        <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />
      ) : (
        <SummaryBody data={summary.data} filters={filters} canOpenReports={canOpenReports} />
      )}
    </section>
  )
}

function SummaryBody({
  data,
  filters,
  canOpenReports,
}: {
  data: ManagerSummary
  filters: ReportFilters
  canOpenReports: boolean
}) {
  const { kpis, actions } = data
  const search = toSearch(filters)
  const report = (code: string, children: ReactNode, className?: string) =>
    canOpenReports ? (
      <Link to="/office/reports/$code" params={{ code }} search={search} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    )

  const revenueNote =
    kpis.revenue_target > 0
      ? `${formatPercent((kpis.revenue / kpis.revenue_target) * 100)} dari target ${formatCurrencyCompact(kpis.revenue_target)}`
      : `Bulan lalu ${formatCurrencyCompact(kpis.revenue_previous)}`

  type ActionItem = {
    key: string
    icon: typeof Clock
    text: string
    code?: string
    to?: '/office/inventory' | '/office/billing'
  }
  const candidates: (ActionItem | false)[] = [
    actions.expiring_qty > 0 && {
      key: 'expiry',
      icon: Clock,
      text: `${formatNumber(actions.expiring_qty)} pcs dekat kedaluwarsa (${actions.expiring_batches} batch)`,
      code: 'expiry',
    },
    actions.below_minimum.length > 0 && {
      key: 'minimum',
      icon: PackageMinus,
      text: `${actions.below_minimum.length} produk gudang di bawah minimum: ${actions.below_minimum
        .slice(0, 3)
        .map((p) => p.product)
        .join(', ')}${actions.below_minimum.length > 3 ? ', …' : ''}`,
      to: '/office/inventory',
    },
    actions.overdue_outlets > 0 && {
      key: 'overdue',
      icon: Wallet,
      text: `${actions.overdue_outlets} outlet punya tagihan lewat jatuh tempo`,
      to: '/office/billing',
    },
    actions.unvisited_outlets > 0 && {
      key: 'unvisited',
      icon: Store,
      text: `${actions.unvisited_outlets} outlet lewat siklus kunjungan`,
      code: 'unvisited-outlets',
    },
    data.slow_products > 0 && {
      key: 'slow',
      icon: TrendingDown,
      text: `${data.slow_products} produk lambat laku`,
      code: 'stock-turnover',
    },
  ]
  const actionItems = candidates.filter((item): item is ActionItem => item !== false)

  const tile = 'flex h-full min-w-0 flex-col gap-1 rounded-lg border border-border bg-card shadow-card p-3 sm:p-4'
  const tileLink = `${tile} transition-shadow hover:border-primary hover:shadow-raised`

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li>
          {report(
            'sales-performance',
            <>
              <KpiLabel icon={Banknote} tone="brand">
                Omzet bulan ini
              </KpiLabel>
              <span className="text-2xl font-bold tabular-nums sm:text-3xl" title={formatCurrency(kpis.revenue)}>
                {formatCurrencyCompact(kpis.revenue)}
              </span>
              <span className="text-sm text-muted-foreground">{revenueNote}</span>
            </>,
            canOpenReports ? tileLink : tile,
          )}
        </li>
        <li>
          {report(
            'visits',
            <>
              <KpiLabel icon={CalendarCheck} tone="info">
                Kunjungan
              </KpiLabel>
              <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                {formatNumber(kpis.visits)}
                {kpis.visit_target > 0 && (
                  <span className="text-lg font-normal text-muted-foreground">
                    {' '}
                    / {formatNumber(kpis.visit_target)}
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {kpis.visit_target > 0 ? 'dibanding target' : 'Target belum diisi'}
              </span>
            </>,
            canOpenReports ? tileLink : tile,
          )}
        </li>
        <li>
          {report(
            'unvisited-outlets',
            <>
              <KpiLabel icon={Store} tone={kpis.unvisited_outlets > 0 ? 'warning' : 'brand'}>
                Belum dikunjungi
              </KpiLabel>
              <span className="text-2xl font-bold tabular-nums sm:text-3xl">
                {formatNumber(kpis.unvisited_outlets)} outlet
              </span>
              <span className="text-sm text-muted-foreground">lewat siklus kunjungan</span>
            </>,
            canOpenReports ? tileLink : tile,
          )}
        </li>
        <li>
          <Link to="/office/billing" className={tileLink}>
            <KpiLabel icon={Wallet} tone={kpis.unpaid_outlets > 0 ? 'warning' : 'brand'}>
              Belum dibayar
            </KpiLabel>
            <span className="text-2xl font-bold tabular-nums sm:text-3xl">
              {formatNumber(kpis.unpaid_outlets)} outlet
            </span>
            <span className="text-sm text-muted-foreground">{formatCurrency(kpis.unpaid_amount)}</span>
          </Link>
        </li>
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Performa sales" subtitle="Omzet dibanding target bulan ini">
          {data.sales.length === 0 ? (
            <Empty>Belum ada sales.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.sales.map((s) => (
                <li key={s.sales_user_id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="tabular-nums">
                      {formatCurrencyCompact(s.revenue)}
                      {s.target_percent !== null && (
                        <span className="font-semibold"> · {formatPercent(s.target_percent)}</span>
                      )}
                    </span>
                  </div>
                  {s.target_percent !== null ? (
                    <Meter value={s.target_percent} />
                  ) : (
                    <span className="text-sm text-muted-foreground">Target belum diisi</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(s.visits)} kunjungan
                    {s.visit_target > 0 && ` dari target ${formatNumber(s.visit_target)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Outlet paling aktif" subtitle="Menurut omzet bulan ini">
          {data.top_outlets.length === 0 ? (
            <Empty>Belum ada kunjungan bulan ini.</Empty>
          ) : (
            <ol className="flex flex-col divide-y divide-border">
              {data.top_outlets.map((o) => (
                <li key={o.outlet_id} className="flex items-baseline gap-3 py-2">
                  <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">{o.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{o.outlet}</span>
                    <span className="text-sm text-muted-foreground">
                      {o.region} · {formatNumber(o.visits)} kunjungan · laku {formatNumber(o.sold)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCurrencyCompact(o.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Perputaran stok" subtitle="Persen laku dari titipan awal (L ÷ J)">
          {data.turnover.length === 0 ? (
            <Empty>Belum ada kunjungan titip jual bulan ini.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.turnover.map((p) => (
                <li key={p.product_id} className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">{p.product}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {p.slow && (
                        <StatusChip variant="warning" icon={TrendingDown}>
                          Lambat
                        </StatusChip>
                      )}
                      <span className="font-semibold">
                        {p.sell_through === null ? '—' : formatPercent(p.sell_through)}
                      </span>
                    </span>
                  </div>
                  <Meter value={p.sell_through ?? 0} />
                  <span className="text-sm text-muted-foreground">
                    Laku {formatNumber(p.sold)} dari {formatNumber(p.opening)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Perlu tindakan" subtitle="Keadaan hari ini">
          {actionItems.length === 0 ? (
            <Empty>Tidak ada yang perlu ditindak.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {actionItems.map((item) => {
                const Icon = item.icon
                const body = (
                  <>
                    <Icon className="mt-0.5 size-5 shrink-0 text-warning-text" aria-hidden />
                    <span className="flex-1">{item.text}</span>
                    <span className="shrink-0 font-medium text-leaf-700">Lihat</span>
                  </>
                )
                const className =
                  'flex min-h-11 items-start gap-3 rounded-md bg-warning-soft px-3 py-2.5 hover:outline hover:outline-warning-text/40'
                if (item.code) {
                  return canOpenReports ? (
                    <li key={item.key}>
                      <Link
                        to="/office/reports/$code"
                        params={{ code: item.code }}
                        search={search}
                        className={className}
                      >
                        {body}
                      </Link>
                    </li>
                  ) : (
                    <li key={item.key} className={cn(className, 'hover:outline-none')}>
                      <Icon className="mt-0.5 size-5 shrink-0 text-warning-text" aria-hidden />
                      <span className="flex-1">{item.text}</span>
                    </li>
                  )
                }
                return (
                  <li key={item.key}>
                    <Link to={item.to ?? '/office'} className={className}>
                      {body}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

type Tone = 'brand' | 'info' | 'warning' | 'danger'

const TONE: Record<Tone, string> = {
  brand: 'bg-tile-brand text-leaf-700',
  info: 'bg-tile-info text-info',
  warning: 'bg-tile-warning text-warning-text',
  danger: 'bg-tile-danger text-danger',
}

/** KPI label with an icon tile. The tile colour follows the status meaning (UI guide §2.3), never decoration. */
function KpiLabel({ icon: Icon, tone, children }: { icon: LucideIcon; tone: Tone; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-md', TONE[tone])} aria-hidden>
        <Icon className="size-5" />
      </span>
      <span className="font-medium text-muted-foreground">{children}</span>
      {/* Only when the tile is a link: the chevron says "opens the report" */}
      <ChevronRight className="ml-auto hidden size-5 shrink-0 text-leaf-700 [a_&]:block" aria-hidden />
    </span>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4"
    >
      <header>
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>
      {children}
    </section>
  )
}

/** One-series meter: the number is always printed beside it, so the bar never carries meaning alone. */
function Meter({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-muted-foreground">
      <CircleAlert className="size-4" aria-hidden />
      {children}
    </p>
  )
}
