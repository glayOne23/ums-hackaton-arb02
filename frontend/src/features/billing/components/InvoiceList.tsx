import { Link } from '@tanstack/react-router'
import { CircleAlert, CircleCheck, MessageCircle, Printer, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { OpenHint } from '@/components/common/OpenHint'
import { StatusChip } from '@/components/common/StatusChip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { formatCurrency, formatTableDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useOpenInvoices } from '../api'
import { collectionText, groupByOutlet } from '../collection'
import { BillingTabs } from './BillingTabs'

/**
 * W6 / TG-01 — unpaid invoices per outlet and per sales, with how long they
 * have waited. The filtered list prints, or goes by WhatsApp, for a collector
 * who does not use the app; the result is recorded here afterwards.
 */
export function InvoiceList() {
  const invoices = useOpenInvoices()
  const [search, setSearch] = useState('')
  const [salesId, setSalesId] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const query = useDeferredValue(search.trim().toLowerCase())
  const [today] = useState(() => new Date())

  const all = invoices.data?.data ?? []
  const salesOptions = [...new Map(all.filter((i) => i.sales).map((i) => [i.sales!.id, i.sales!.name])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1], 'id'),
  )
  const shown = all.filter(
    (i) =>
      (!salesId || String(i.sales?.id) === salesId) &&
      (!overdueOnly || i.overdue) &&
      (!query || i.number.toLowerCase().includes(query) || (i.outlet?.name.toLowerCase().includes(query) ?? false)),
  )
  const groups = groupByOutlet(shown)
  const total = groups.reduce((sum, g) => sum + Math.round(g.owed * 100), 0) / 100
  const salesName = salesOptions.find(([id]) => String(id) === salesId)?.[1]
  const title = `Daftar tagihan belum dibayar${salesName ? ` · ${salesName}` : ''} · ${formatTableDate(today)}`

  return (
    <section className="flex flex-col gap-5 pb-8">
      <header className="print:hidden">
        <h1 className="text-2xl font-semibold">Tagihan</h1>
        <p className="text-muted-foreground">Tagihan outlet yang belum lunas, yang paling lama menunggu di atas.</p>
      </header>
      <BillingTabs />

      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Cari outlet atau nomor tagihan"
            placeholder="Cari outlet atau nomor tagihan"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <NativeSelect aria-label="Sales" value={salesId} onChange={(e) => setSalesId(e.target.value)}>
          <option value="">Semua sales</option>
          {salesOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant={overdueOnly ? 'default' : 'outline'}
          aria-pressed={overdueOnly}
          onClick={() => setOverdueOnly((v) => !v)}
        >
          <CircleAlert aria-hidden />
          Lewat jatuh tempo
        </Button>
      </div>

      {invoices.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      ) : invoices.isError ? (
        <ErrorState message={invoices.error.message} onRetry={() => invoices.refetch()} />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleCheck className="size-12 text-success-text" aria-hidden />
          <p className="text-lg">
            {all.length === 0 ? 'Semua tagihan sudah lunas.' : 'Tidak ada tagihan di saringan ini.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card shadow-card p-4 print:hidden">
            <p className="text-lg">
              {groups.length} outlet · {shown.length} tagihan ·{' '}
              <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden />
                Cetak daftar
              </Button>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(collectionText(groups, title))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle aria-hidden />
                  Kirim lewat WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <ul className="flex flex-col gap-3 print:hidden">
            {groups.map((group) => (
              <li
                key={group.outletId}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card shadow-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold wrap-break-word">{group.outlet.name}</p>
                    <p className="text-muted-foreground">
                      {[group.outlet.district, group.outlet.region].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">{formatCurrency(group.owed)}</p>
                </div>
                <ul className="flex flex-col divide-y divide-earth-200 border-t border-earth-200">
                  {group.invoices.map((invoice) => (
                    <li key={invoice.id}>
                      <Link
                        to="/office/billing/invoices/$invoiceId"
                        params={{ invoiceId: invoice.id }}
                        className="-mx-2 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-leaf-50"
                      >
                        <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block font-semibold text-leaf-800">{invoice.number}</span>
                            <span className="block text-sm text-muted-foreground">
                              {formatTableDate(new Date(invoice.invoice_date))} ·{' '}
                              <span className={cn(invoice.age_days > 30 && 'font-medium text-warning-text')}>
                                {invoice.age_days} hari
                              </span>
                              {invoice.sales && ` · ${invoice.sales.name}`}
                            </span>
                          </span>
                          <span className="flex flex-wrap items-center gap-2">
                            {invoice.overdue && (
                              <StatusChip variant="danger" icon={CircleAlert}>
                                Lewat jatuh tempo
                              </StatusChip>
                            )}
                            <span className="font-semibold tabular-nums">{formatCurrency(invoice.owed)}</span>
                          </span>
                        </span>
                        <OpenHint label="Buka" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {/* Printed collection list: a column for the collector to write what was paid */}
          <div className="hidden print:block">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p>
              {groups.length} outlet · total {formatCurrency(total)}
            </p>
            <table className="mt-3 w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {['No', 'Outlet', 'Tagihan', 'Sisa', 'Dibayar', 'Paraf'].map((h) => (
                    <th key={h} className="border border-earth-900 p-1.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group, i) => (
                  <tr key={group.outletId} className="break-inside-avoid align-top">
                    <td className="border border-earth-900 p-1.5">{i + 1}</td>
                    <td className="border border-earth-900 p-1.5">
                      <strong>{group.outlet.name}</strong>
                      <br />
                      {[group.outlet.address, group.outlet.district, group.outlet.region].filter(Boolean).join(', ')}
                      {group.outlet.whatsapp_number && (
                        <>
                          <br />
                          WA {group.outlet.whatsapp_number}
                        </>
                      )}
                    </td>
                    <td className="border border-earth-900 p-1.5">
                      {group.invoices.map((inv) => (
                        <div key={inv.id}>
                          {inv.number} · {formatTableDate(new Date(inv.invoice_date))} · {formatCurrency(inv.owed)}
                        </div>
                      ))}
                    </td>
                    <td className="border border-earth-900 p-1.5 text-right font-semibold">
                      {formatCurrency(group.owed)}
                    </td>
                    <td className="w-28 border border-earth-900 p-1.5" />
                    <td className="w-20 border border-earth-900 p-1.5" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
