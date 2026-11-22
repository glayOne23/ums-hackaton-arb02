import { Link } from '@tanstack/react-router'
import { CircleAlert, LoaderCircle, Save } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { StatusChip } from '@/components/common/StatusChip'
import { OpenHint } from '@/components/common/OpenHint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, formatExpiry, formatNumber, formatTableDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePermission } from '@/stores/session'
import { useOutletOverview, useSaveStockTargets } from '../api'
import type { OutletOverview } from '../types'

type Tab = 'stock' | 'visits' | 'invoices'

/**
 * W2 / OT-03: the outlet's shelf (with the optional stok standar, OT-07),
 * its recent visits, and what it still owes, as tabs under the outlet data.
 */
export function OutletOverviewPanel({ outletId }: { outletId: string }) {
  const overview = useOutletOverview(outletId)
  const [tab, setTab] = useState<Tab>('stock')
  const id = useId()

  if (overview.isPending) return <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (overview.isError) return <ErrorState message={overview.error.message} onRetry={() => overview.refetch()} />
  const data = overview.data

  const tabs: { key: Tab; label: string }[] = [
    { key: 'stock', label: `Stok titipan (${formatNumber(data.stock_total)})` },
    { key: 'visits', label: 'Riwayat kunjungan' },
    { key: 'invoices', label: `Tagihan${data.invoices.length ? ` (${data.invoices.length})` : ''}` },
  ]

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card shadow-card p-4 sm:p-6">
      <p className={cn('flex flex-wrap items-center gap-2', data.visit_overdue && 'text-warning-text')}>
        {data.visit_overdue && <CircleAlert className="size-5" aria-hidden />}
        {data.last_visit_at
          ? `Kunjungan terakhir ${formatDate(new Date(data.last_visit_at))} · siklus ${data.visit_cycle_days} hari`
          : `Belum pernah dikunjungi · siklus ${data.visit_cycle_days} hari`}
        {data.next_visit_due &&
          ` · ${data.visit_overdue ? 'sudah lewat jadwal' : 'kunjungan berikutnya'} ${formatTableDate(new Date(data.next_visit_due))}`}
      </p>

      <div role="tablist" aria-label="Isi profil outlet" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${id}-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`${id}-${t.key}-panel`}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex h-11 items-center rounded-full border px-4 font-medium whitespace-nowrap',
              tab === t.key ? 'choice-on' : 'choice',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${id}-${tab}-panel`} aria-labelledby={`${id}-${tab}`}>
        {tab === 'stock' && <StockTab outletId={outletId} data={data} />}
        {tab === 'visits' && <VisitsTab data={data} />}
        {tab === 'invoices' && <InvoicesTab data={data} />}
      </div>
    </section>
  )
}

function StockTab({ outletId, data }: { outletId: string; data: OutletOverview }) {
  const canManage = usePermission('outlet.manage')
  const save = useSaveStockTargets(outletId)
  const [targets, setTargets] = useState<Record<string, string>>({})
  const changed = Object.entries(targets).filter(([productId, value]) => {
    const current = data.stock.find((s) => s.product.id === productId)?.target_qty ?? null
    return (value === '' ? null : Number(value)) !== current
  })

  if (data.stock.length === 0) {
    return <p className="text-muted-foreground">Belum ada barang titipan di outlet ini.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-earth-200">
        {data.stock.map((row) => {
          const inputId = `target-${row.product.id}`
          const value = targets[row.product.id] ?? (row.target_qty === null ? '' : String(row.target_qty))
          return (
            <li key={row.product.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium wrap-break-word">{row.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Titipan <span className="font-semibold text-foreground tabular-nums">{formatNumber(row.qty)}</span>
                  {row.nearest_expiry && <> · {formatExpiry(new Date(row.nearest_expiry))}</>}
                  {' · '}laku 3 bulan {formatNumber(row.sold_3_months)}
                </p>
                {row.near_expiry_qty > 0 && (
                  <StatusChip variant="warning" icon={CircleAlert} className="mt-1">
                    {formatNumber(row.near_expiry_qty)} perlu ditarik (ED dekat)
                  </StatusChip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={inputId} className="text-sm text-muted-foreground">
                  Stok standar
                </label>
                {canManage ? (
                  <Input
                    id={inputId}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="—"
                    className="w-20 tabular-nums"
                    value={value}
                    onChange={(e) => setTargets((all) => ({ ...all, [row.product.id]: e.target.value }))}
                  />
                ) : (
                  <span id={inputId} className="w-12 text-right tabular-nums">
                    {row.target_qty ?? '—'}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-muted-foreground">
        Stok standar boleh kosong. Bila diisi, kunjungan berikutnya menyarankan isi ulang sampai jumlah itu; bila
        kosong, kembali ke titipan sebelumnya.
      </p>
      {canManage && changed.length > 0 && (
        <Button
          className="self-start"
          disabled={save.isPending}
          onClick={() =>
            save.mutate(
              changed.map(([product_id, value]) => ({ product_id, target_qty: value === '' ? null : Number(value) })),
              {
                onSuccess: (r) => {
                  setTargets({})
                  toast.success(`${r.changed} stok standar tersimpan`)
                },
                onError: (e) => toast.error(e.message),
              },
            )
          }
        >
          {save.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Simpan stok standar ({changed.length})
        </Button>
      )}
    </div>
  )
}

function VisitsTab({ data }: { data: OutletOverview }) {
  const canOpen = usePermission('visit.view')
  if (data.visits.length === 0) return <p className="text-muted-foreground">Belum ada kunjungan.</p>

  return (
    <ul className="flex flex-col divide-y divide-earth-200">
      {data.visits.map((v) => {
        const body = (
          <>
            <span className="min-w-0">
              <span className={cn('block font-medium', v.status.value !== 'active' && 'line-through')}>
                {v.number} · {v.type.label}
              </span>
              <span className="block text-sm text-muted-foreground">
                {formatDate(new Date(v.transacted_at))} · {v.sales} · laku {formatNumber(v.sold_qty)}
                {v.status.value !== 'active' && ` · ${v.status.label}`}
                {v.needs_review && ' · perlu dicek'}
              </span>
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(v.total)}</span>
          </>
        )
        return (
          <li key={v.id}>
            {canOpen ? (
              <Link
                to="/office/visits/$transactionId"
                params={{ transactionId: v.id }}
                className="-mx-2 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-leaf-50"
              >
                <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">{body}</span>
                <OpenHint label="Buka" />
              </Link>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 py-2">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function InvoicesTab({ data }: { data: OutletOverview }) {
  const canOpen = usePermission('invoice.view')
  if (data.invoices.length === 0) return <p className="text-muted-foreground">Tidak ada tagihan yang belum dibayar.</p>

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg">
        Belum dibayar: <span className="font-semibold tabular-nums">{formatCurrency(data.owed_total)}</span>
      </p>
      <ul className="flex flex-col divide-y divide-earth-200">
        {data.invoices.map((i) => {
          const body = (
            <>
              <span className="min-w-0">
                <span className="block font-medium">{i.number}</span>
                <span className="block text-sm text-muted-foreground">
                  {formatTableDate(new Date(i.invoice_date))} · jatuh tempo {formatTableDate(new Date(i.due_date))}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {i.overdue && (
                  <StatusChip variant="danger" icon={CircleAlert}>
                    Lewat jatuh tempo
                  </StatusChip>
                )}
                <span className="font-semibold tabular-nums">{formatCurrency(i.owed)}</span>
              </span>
            </>
          )
          return (
            <li key={i.id}>
              {canOpen ? (
                <Link
                  to="/office/billing/invoices/$invoiceId"
                  params={{ invoiceId: i.id }}
                  className="-mx-2 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-leaf-50"
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">{body}</span>
                  <OpenHint label="Buka" />
                </Link>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 py-2">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
