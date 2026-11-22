import { useNavigate } from '@tanstack/react-router'
import { CircleAlert, PackageOpen, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { NumberStepper } from '@/components/common/NumberStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useSaveReceipt, useWorkPackage } from '../api'
import { lineTotal, sumMoney } from '../calc'
import { buildReceipt } from '../receipt'
import type { PackageOutlet, WorkPackage } from '../types'
import { NotAssigned, VisitHeader } from './ConsignmentVisit'
import { type Payment, PaymentSheet } from './PaymentSheet'

/** M5 — Beli langsung / tempo (KS-07): the outlet buys from what the sales carries. */
export function DirectSale({ outletId }: { outletId: string }) {
  const pkg = useWorkPackage()
  const outlet = pkg.data?.outlets.find((o) => o.id === outletId)

  if (pkg.isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (!pkg.data)
    return <ErrorState message={pkg.error?.message ?? 'Data belum terunduh.'} onRetry={() => pkg.refetch()} />
  if (!outlet) return <NotAssigned />

  return <SaleForm pkg={pkg.data} outlet={outlet} />
}

function SaleForm({ pkg, outlet }: { pkg: WorkPackage; outlet: PackageOutlet }) {
  const navigate = useNavigate()
  const userId = useSession((s) => s.user?.id ?? 0)
  const saveReceipt = useSaveReceipt()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const query = useDeferredValue(search.trim().toLowerCase())

  const names = new Map(pkg.products.map((p) => [p.id, p.name]))
  const [carried] = useState(() =>
    pkg.carried
      .map((c) => ({ ...c, name: names.get(c.product_id) ?? 'Produk', price: outlet.prices[c.product_id]?.price ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id')),
  )
  const shown = carried.filter((c) => !query || c.name.toLowerCase().includes(query))
  const chosen = carried.filter((c) => (qty[c.product_id] ?? 0) > 0)
  const total = sumMoney(chosen.map((c) => lineTotal(qty[c.product_id], c.price)))
  const tooMany = chosen.some((c) => qty[c.product_id] > c.qty)
  const credit = outlet.sale_mode.value === 'credit'
  const [dueDate] = useState(() => new Date(Date.now() + pkg.settings.credit_term_days * 86_400_000))

  const save = async (payment: Payment) => {
    const receipt = buildReceipt({
      userId,
      outlet,
      type: 'direct_sale',
      items: chosen.map((c) => ({ product_id: c.product_id, sold_qty: qty[c.product_id] })),
      lines: chosen.map((c) => ({
        productId: c.product_id,
        name: c.name,
        sold: qty[c.product_id],
        withdrawn: 0,
        refill: 0,
        closing: null,
        price: c.price,
        total: lineTotal(qty[c.product_id], c.price),
      })),
      paid: payment.amount,
      method: payment.method,
      photo: payment.photo,
      settings: pkg.settings,
    })
    await saveReceipt(receipt)
    await navigate({ to: '/field/receipt/$clientUuid', params: { clientUuid: receipt.client_uuid }, replace: true })
  }

  return (
    <section className="flex flex-col gap-4 pb-40">
      <VisitHeader
        outlet={outlet}
        extra={credit ? `Tempo ${pkg.settings.credit_term_days} hari` : outlet.sale_mode.label}
      />

      {carried.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-10 text-center">
          <PackageOpen className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Belum membawa barang. Minta barang ke gudang dulu.</p>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Cari produk"
              className="h-12 pl-10 text-base sm:h-12"
              placeholder="Cari produk…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
            {shown.map((c) => {
              const n = qty[c.product_id] ?? 0
              return (
                <li key={c.product_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                    <span className="block text-lg">{c.name}</span>
                    <span className="block text-muted-foreground">
                      {formatCurrency(c.price)} · bawa {c.qty}
                    </span>
                  </span>
                  <div className="ml-auto">
                    <NumberStepper
                      id={`buy-${c.product_id}`}
                      label={`Beli ${c.name}`}
                      value={n}
                      initial={0}
                      onChange={(value) => setQty((all) => ({ ...all, [c.product_id]: value }))}
                    />
                  </div>
                  {n > c.qty && (
                    <p role="alert" className="flex basis-full items-start gap-2 text-danger-text">
                      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                      Stok bawaan hanya {c.qty}.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-xl flex-col gap-2 border-t border-border bg-card p-3">
        <p className="flex justify-between text-lg" aria-live="polite">
          <span>Total setelah potongan</span>
          <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
        </p>
        <Button size="cta" disabled={chosen.length === 0 || tooMany} onClick={() => setSheetOpen(true)}>
          {tooMany ? 'Perbaiki angka yang merah' : chosen.length === 0 ? 'Pilih jumlah barang' : 'Lanjut'}
        </Button>
      </div>

      <PaymentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        total={total}
        previousUnpaid={outlet.unpaid}
        hint={
          credit
            ? { collectNow: false, text: `Tempo: jatuh tempo ${formatDate(dueDate)} bila belum dibayar.` }
            : { collectNow: true, text: 'Beli langsung: sebaiknya dibayar sekarang.' }
        }
        photoRequired={pkg.settings.form_photo_required}
        onSave={save}
      />
    </section>
  )
}
