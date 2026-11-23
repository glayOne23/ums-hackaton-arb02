import { Link } from '@tanstack/react-router'
import { Store, TriangleAlert, Truck, Warehouse } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ErrorState } from '@/components/common/ErrorState'
import { SectionCard } from '@/components/common/SectionCard'
import { StatusChip } from '@/components/common/StatusChip'
import { formatExpiry, formatNumber } from '@/lib/format'
import { usePermission } from '@/stores/session'
import { useProductStock } from '../api'
import type { Product, ProductStockBreakdown } from '../types'

/**
 * Where the product is now (office): totals for the warehouse, outlets, and
 * sales, then which outlets hold it, which sales carry it, and the warehouse batches.
 */
export function ProductStockPanel({ product }: { product: Product }) {
  const stock = useProductStock(product.id, true)

  if (stock.isPending) {
    return <div className="h-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
  }
  if (stock.isError) {
    return <ErrorState message={stock.error.message} onRetry={() => stock.refetch()} />
  }

  return <Breakdown product={product} data={stock.data} />
}

function Breakdown({ product, data }: { product: Product; data: ProductStockBreakdown }) {
  const canOpenOutlets = usePermission('outlet.view')
  const unit = product.unit
  const { totals } = data

  return (
    <section aria-labelledby="product-stock" className="flex flex-col gap-4">
      <h2 id="product-stock" className="text-xl font-bold tracking-tight">
        Stok saat ini
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={Warehouse} label="Stok gudang" value={`${formatNumber(totals.warehouse_qty)} ${unit}`} />
        <Tile
          icon={Store}
          label="Stok di outlet"
          value={`${formatNumber(totals.outlet_qty)} ${unit}`}
          note={`dititipkan di ${formatNumber(totals.outlet_count)} outlet`}
        />
        <Tile icon={Truck} label="Dibawa sales" value={`${formatNumber(totals.sales_qty)} ${unit}`} />
      </div>

      <SectionCard title={`Dititipkan di ${formatNumber(totals.outlet_count)} outlet`}>
        {data.outlets.length === 0 ? (
          <p className="text-muted-foreground">Produk ini belum dititipkan di outlet mana pun.</p>
        ) : (
          <div className="-mx-4 -my-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-table-head text-table-head-foreground">
                <tr>
                  <th scope="col" className="h-11 px-4 text-sm font-semibold">
                    Outlet
                  </th>
                  <th scope="col" className="hidden h-11 px-4 text-sm font-semibold sm:table-cell">
                    Kecamatan · Kab/Kota
                  </th>
                  <th scope="col" className="h-11 px-4 text-right text-sm font-semibold">
                    Stok
                  </th>
                  <th scope="col" className="h-11 px-4 text-sm font-semibold">
                    ED terdekat
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.outlets.map((outlet) => (
                  <tr key={outlet.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      {canOpenOutlets ? (
                        <Link
                          to="/office/outlets/$outletId"
                          params={{ outletId: outlet.id }}
                          className="font-semibold text-leaf-800 underline decoration-leaf-600/40 underline-offset-4"
                        >
                          {outlet.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{outlet.name}</span>
                      )}
                      <span className="block text-sm text-muted-foreground sm:hidden">
                        {outlet.district}
                        {outlet.region && ` · ${outlet.region}`}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      {outlet.district}
                      {outlet.region && ` · ${outlet.region}`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatNumber(outlet.qty)} {unit}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex flex-wrap items-center gap-2 whitespace-nowrap">
                        {formatExpiry(new Date(outlet.nearest_expiry))}
                        {outlet.near_expiry_qty > 0 && (
                          <StatusChip variant="danger" icon={TriangleAlert}>
                            {formatNumber(outlet.near_expiry_qty)} dekat ED
                          </StatusChip>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Dibawa sales">
          {data.sales.length === 0 ? (
            <p className="text-muted-foreground">Tidak ada sales yang sedang membawa produk ini.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.sales.map((person) => (
                <li key={person.id} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span>{person.name}</span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(person.qty)} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Di gudang per batch">
          {data.warehouse.length === 0 ? (
            <p className="text-muted-foreground">Stok gudang kosong.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.warehouse.map((batch) => (
                <li key={batch.batch_number} className="flex justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span>
                    {batch.batch_number}{' '}
                    <span className="text-muted-foreground">· {formatExpiry(new Date(batch.expiry_date))}</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(batch.qty)} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </section>
  )
}

function Tile({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-leaf-50 text-leaf-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {note && <span className="text-sm text-muted-foreground">{note}</span>}
      </span>
    </div>
  )
}
