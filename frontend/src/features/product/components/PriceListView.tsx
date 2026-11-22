import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatCurrency, formatDiscountPercent, formatTableDate } from '@/lib/format'
import { useOutletTypeOptions, usePriceList } from '../api'
import type { PriceListItem } from '../types'

interface Props {
  outletTypeId: string
  date: string
  onChange: (next: { outletTypeId: string; date: string }) => void
}

/** PR-04 — price list per outlet type, printable. Outlet-specific deals are not on it. */
export function PriceListView({ outletTypeId, date, onChange }: Props) {
  const outletTypes = useOutletTypeOptions()
  // Read the clock once, not on every render
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const effectiveDate = date || today
  const priceList = usePriceList(outletTypeId, effectiveDate)
  const typeName = outletTypes.data?.find((type) => type.id === outletTypeId)?.name

  // Group rows by category, as the printed list is read
  const groups = new Map<string, PriceListItem[]>()
  for (const item of priceList.data?.data ?? []) {
    groups.set(item.product.category, [...(groups.get(item.product.category) ?? []), item])
  }

  return (
    <section className="flex flex-col gap-5">
      <Link to="/office/products" className="flex w-fit items-center gap-2 font-medium text-leaf-700 print:hidden">
        <ArrowLeft className="size-5" aria-hidden />
        Daftar produk
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daftar harga{typeName ? ` ${typeName}` : ''}</h1>
          <p className="text-muted-foreground">
            Berlaku {formatTableDate(new Date(effectiveDate))}. Potongan khusus per outlet tidak termasuk.
          </p>
        </div>
        {priceList.data && (
          <Button variant="outline" className="print:hidden" onClick={() => window.print()}>
            <Printer aria-hidden />
            Cetak
          </Button>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl print:hidden">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-outlet-type">Jenis outlet</Label>
          <NativeSelect
            id="price-outlet-type"
            value={outletTypeId}
            onChange={(event) => onChange({ outletTypeId: event.target.value, date })}
          >
            <option value="">Pilih jenis outlet</option>
            {outletTypes.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price-date">Tanggal</Label>
          <Input
            id="price-date"
            type="date"
            value={effectiveDate}
            onChange={(event) => onChange({ outletTypeId, date: event.target.value })}
          />
        </div>
      </div>

      {outletTypeId === '' ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center">
          <ReceiptText className="size-12 text-muted-foreground" aria-hidden />
          <p className="text-lg">Pilih jenis outlet untuk melihat harganya.</p>
        </div>
      ) : priceList.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : priceList.isError ? (
        <ErrorState message={priceList.error.message} onRetry={() => priceList.refetch()} />
      ) : priceList.data.data.length === 0 ? (
        <p className="text-muted-foreground">Belum ada produk aktif.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card print:border-0">
          <table className="w-full text-left">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="h-11 px-3 text-sm font-semibold text-muted-foreground sm:px-4">
                  Produk
                </th>
                <th
                  scope="col"
                  className="hidden h-11 px-4 text-right text-sm font-semibold text-muted-foreground sm:table-cell"
                >
                  Harga jual
                </th>
                <th
                  scope="col"
                  className="hidden h-11 px-4 text-right text-sm font-semibold text-muted-foreground sm:table-cell"
                >
                  Potongan
                </th>
                <th scope="col" className="h-11 px-3 text-right text-sm font-semibold text-muted-foreground sm:px-4">
                  Harga
                </th>
              </tr>
            </thead>
            {[...groups.entries()].map(([category, items]) => (
              <tbody key={category}>
                <tr className="border-t border-earth-200 bg-earth-50">
                  <th colSpan={4} scope="colgroup" className="px-3 py-2 text-sm font-semibold sm:px-4">
                    {category}
                  </th>
                </tr>
                {items.map((item) => (
                  <tr key={item.product.id} className="border-t border-earth-200">
                    <td className="px-3 py-2 sm:px-4">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {item.product.code} · {item.product.unit}
                      </span>
                      {/* Phones: price and discount move here so the table never scrolls sideways (UI guide §5) */}
                      <span className="block text-sm text-muted-foreground tabular-nums sm:hidden">
                        {formatCurrency(item.selling_price)}
                        {item.discount_percent > 0 && ` − ${formatDiscountPercent(item.discount_percent)}`}
                      </span>
                    </td>
                    <td className="hidden px-4 py-2 text-right whitespace-nowrap tabular-nums sm:table-cell">
                      {formatCurrency(item.selling_price)}
                    </td>
                    <td className="hidden px-4 py-2 text-right whitespace-nowrap tabular-nums sm:table-cell">
                      {item.discount_percent > 0 ? formatDiscountPercent(item.discount_percent) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums sm:px-4">
                      {formatCurrency(item.net_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  )
}
