import { LoaderCircle, Search } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { NumberStepper } from '@/components/common/NumberStepper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatNumber } from '@/lib/format'
import { useProductOptions, useSalesStock, useSubmitStockRequest } from '../api'
import type { StockRequest } from '../types'

/**
 * GD-02 on the phone: numbers only, no typing. What the sales still carries is
 * shown next to each product, so they ask only for what is missing (GD-04).
 */
export function StockRequestForm({ onSaved }: { onSaved: (request: StockRequest) => void }) {
  const products = useProductOptions()
  const carried = useSalesStock()
  const submit = useSubmitStockRequest()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const query = useDeferredValue(search.trim().toLowerCase())

  const carriedQty = new Map((carried.data?.data ?? []).map((row) => [row.product.id, row.qty]))
  const shown = (products.data ?? []).filter((p) => !query || p.name.toLowerCase().includes(query))
  const chosen = Object.entries(qty).filter(([, n]) => n > 0)

  return (
    <section className="flex flex-col gap-4 pb-24">
      <h1 className="text-xl font-bold tracking-tight">Minta barang ke gudang</h1>
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

      {products.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : products.isError ? (
        <ErrorState message={products.error.message} onRetry={() => products.refetch()} />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
          {shown.map((product) => (
            <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              {/* Phones: the name takes its own line, the stepper goes below (no squeezed column) */}
              <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <span className="block text-lg">{product.name}</span>
                <span className="block text-muted-foreground">
                  Dibawa {formatNumber(carriedQty.get(product.id) ?? 0)}
                </span>
              </span>
              <div className="ml-auto">
                <NumberStepper
                  id={`ask-${product.id}`}
                  label={`Minta ${product.name}`}
                  value={qty[product.id] ?? 0}
                  initial={0}
                  onChange={(n) => setQty((all) => ({ ...all, [product.id]: n }))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {submit.error && (
        <p role="alert" className="text-danger-text">
          {submit.error.message}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto max-w-xl border-t border-border bg-card p-3">
        <Button
          size="cta"
          disabled={chosen.length === 0 || submit.isPending}
          onClick={() =>
            submit.mutate(
              { note: '', items: chosen.map(([product_id, n]) => ({ product_id, qty: n })) },
              { onSuccess: onSaved },
            )
          }
        >
          {submit.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {chosen.length === 0 ? 'Pilih jumlah barang' : `Kirim permintaan (${chosen.length} produk)`}
        </Button>
      </div>
    </section>
  )
}
