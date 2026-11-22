import { Link } from '@tanstack/react-router'
import { ChevronRight, CircleAlert, CircleCheck, MessageCircle, Plus, Search, Store, Wallet } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrencyCompact } from '@/lib/format'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'
import { usePermission } from '@/stores/session'
import { useWorkPackage } from '../api'
import { daysSince, isDue } from '../calc'
import type { PackageOutlet } from '../types'
import { InstallBanner } from '@/components/layout/InstallApp'
import { PendingNotice } from './PendingNotice'

type Filter = 'all' | 'due' | 'unpaid'

/**
 * M1 — Outlet saya (KS-01): longest since the last visit first, with the
 * signs "belum dikunjungi", "belum bayar", and "dekat kedaluwarsa". One tap
 * opens the visit (consignment) or the sale (cash / credit). Works offline
 * from the work package.
 */
export function FieldOutletList() {
  const canPropose = usePermission('outlet.propose')
  const pkg = useWorkPackage()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const query = useDeferredValue(search.trim().toLowerCase())

  const visitedToday = new Set(pkg.data?.today.visited_outlet_ids ?? [])
  const outlets = [...(pkg.data?.outlets ?? [])].sort(byLongestAway(visitedToday))
  const due = outlets.filter((o) => !visitedToday.has(o.id) && isDue(o))
  const unpaid = outlets.filter((o) => o.unpaid > 0)
  const shown = (filter === 'due' ? due : filter === 'unpaid' ? unpaid : outlets).filter(
    (o) =>
      query === '' ||
      o.name.toLowerCase().includes(query) ||
      o.district.toLowerCase().includes(query) ||
      (o.region?.toLowerCase().includes(query) ?? false),
  )

  return (
    <section className="flex flex-col gap-4">
      {/* PW-02: one tap to put SIGAP on the home screen */}
      <InstallBanner />
      <PendingNotice />
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Cari outlet"
          className="h-12 bg-card pl-10 text-base shadow-card sm:h-12"
          placeholder="Cari outlet…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Saring outlet">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Semua {outlets.length}
        </FilterChip>
        <FilterChip active={filter === 'due'} onClick={() => setFilter('due')}>
          Perlu dikunjungi {due.length}
        </FilterChip>
        <FilterChip active={filter === 'unpaid'} onClick={() => setFilter('unpaid')}>
          Belum bayar {unpaid.length}
        </FilterChip>
      </div>

      {pkg.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat outlet">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : pkg.isError && !pkg.data ? (
        <ErrorState message={pkg.error.message} onRetry={() => pkg.refetch()} />
      ) : shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Store className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">
            {query
              ? 'Tidak ada outlet dengan nama itu.'
              : outlets.length === 0
                ? 'Belum ada outlet yang ditugaskan. Hubungi admin kantor.'
                : 'Tidak ada outlet di saringan ini.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((outlet) => (
            <OutletRow key={outlet.id} outlet={outlet} done={visitedToday.has(outlet.id)} />
          ))}
        </ul>
      )}

      {/* OT-05: a new shop met on the road */}
      {canPropose && (
        <Button asChild variant="outline" className="self-start">
          <Link to="/field/propose">
            <Plus aria-hidden />
            Usulkan outlet baru
          </Link>
        </Button>
      )}
    </section>
  )
}

function OutletRow({ outlet, done }: { outlet: PackageOutlet; done: boolean }) {
  const days = daysSince(outlet.last_visit_at)
  const nearExpiry = outlet.stock.filter((s) => s.near_expiry_qty > 0).length
  const consignment = outlet.sale_mode.value === 'consignment'
  const veryLong = days === null || days >= outlet.visit_cycle_days * 2
  // Left accent = the most urgent sign on the card (UI guide §2.3), read before the text
  const accent: Accent =
    nearExpiry > 0 ? 'danger' : done ? 'success' : outlet.unpaid > 0 || veryLong ? 'warning' : 'none'

  return (
    <li
      className={cn(
        'flex items-stretch gap-2 rounded-lg border border-l-4 border-border bg-card shadow-card',
        ACCENT[accent],
      )}
    >
      <Link
        to={consignment ? '/field/visit/$outletId' : '/field/sale/$outletId'}
        params={{ outletId: outlet.id }}
        className="flex min-w-0 flex-1 gap-3 rounded-lg p-4 active:bg-accent"
      >
        {/* Decoration only: hidden at larger text sizes (UX-08) so the name and signs keep the room */}
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-tile-brand text-base font-bold text-leaf-800 [:root[data-font-size]_&]:hidden"
          aria-hidden
        >
          {initials(outlet.name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            {/* Wrap, never cut: the end of a name is often what tells two outlets apart */}
            <span className="text-lg font-semibold wrap-break-word">{outlet.name}</span>
            <span className="text-muted-foreground">{outlet.region}</span>
          </span>
          <span className="text-muted-foreground">
            {consignment ? '' : `${outlet.sale_mode.label} · `}
            {done ? (
              <span className="font-medium text-success-text">Selesai hari ini</span>
            ) : days === null ? (
              <span className="font-medium text-warning-text">Belum pernah dikunjungi</span>
            ) : (
              <span className={cn(veryLong && 'font-medium text-warning-text')}>
                {days === 0 ? 'Dikunjungi hari ini' : `${days} hari lalu`}
                {veryLong && ' (sangat lama)'}
              </span>
            )}
          </span>
          {(done || outlet.unpaid > 0 || nearExpiry > 0) && (
            <span className="flex flex-wrap gap-2 pt-1">
              {done && (
                <StatusChip variant="success" icon={CircleCheck}>
                  Selesai
                </StatusChip>
              )}
              {outlet.unpaid > 0 && (
                <StatusChip variant="warning" icon={Wallet}>
                  Belum bayar {formatCurrencyCompact(outlet.unpaid)}
                </StatusChip>
              )}
              {nearExpiry > 0 && (
                <StatusChip variant="danger" icon={CircleAlert}>
                  {nearExpiry} produk dekat kedaluwarsa
                </StatusChip>
              )}
            </span>
          )}
        </span>
        {/* Opens the visit: the chevron makes the whole card read as a button */}
        <ChevronRight className="size-6 shrink-0 self-center text-leaf-700" aria-hidden />
      </Link>
      {outlet.whatsapp_number && (
        <a
          href={whatsappLink(outlet.whatsapp_number)}
          target="_blank"
          rel="noreferrer"
          className="my-3 mr-3 grid size-12 shrink-0 place-items-center self-start rounded-md border border-leaf-600 bg-leaf-50 text-leaf-800 active:bg-leaf-200"
          aria-label={`WhatsApp ${outlet.name}`}
        >
          <MessageCircle className="size-6" aria-hidden />
        </a>
      )}
    </li>
  )
}

type Accent = 'danger' | 'warning' | 'success' | 'none'

const ACCENT: Record<Accent, string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  success: 'border-l-success',
  none: 'border-l-border',
}

/** Words that only say what kind of shop it is; skipped so "Apotek Sari Sehat" reads "SS". */
const SHOP_WORDS = new Set([
  'ap',
  'apotek',
  'apotik',
  'toko',
  'tk',
  'to',
  'depot',
  'minimarket',
  'swalayan',
  'koperasi',
  'contoh',
])

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !SHOP_WORDS.has(w.toLowerCase()))
  const picked = (words.length > 0 ? words : name.split(/\s+/)).slice(0, 2)
  return picked.map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('h-11 rounded-full border px-4 text-base', active ? 'choice-on' : 'choice shadow-card')}
    >
      {children}
    </button>
  )
}

/** Not done today first, then never visited, then longest since the last visit. */
function byLongestAway(visitedToday: Set<string>) {
  return (a: PackageOutlet, b: PackageOutlet) => {
    const doneA = visitedToday.has(a.id) ? 1 : 0
    const doneB = visitedToday.has(b.id) ? 1 : 0
    if (doneA !== doneB) return doneA - doneB
    const daysA = daysSince(a.last_visit_at) ?? Number.MAX_SAFE_INTEGER
    const daysB = daysSince(b.last_visit_at) ?? Number.MAX_SAFE_INTEGER
    return daysB - daysA || a.name.localeCompare(b.name, 'id')
  }
}
