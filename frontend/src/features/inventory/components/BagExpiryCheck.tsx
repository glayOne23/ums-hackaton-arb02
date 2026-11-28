import { Link, useNavigate } from '@tanstack/react-router'
import { CalendarCheck, ChevronLeft, CircleAlert, CloudOff, LoaderCircle, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { NumberStepper } from '@/components/common/NumberStepper'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { expiryLabel, expirySummary, total, type ExpiryMonth } from '@/lib/expiry'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { uuid } from '@/lib/uuid'
import { useBagExpiryCheck, useSalesStock, useStockRequests } from '../api'
import type { ProductStock } from '../types'

/** Months the sales may add for an ED the ledger does not have in the bag: this month and 5 years ahead. */
function futureMonths(now = new Date()): string[] {
  return Array.from({ length: 61 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

/**
 * Doc 11 — "Cek ED bawaan": the sales counts what they carry per ED, for
 * example right after goods came from the warehouse ("Cocokkan ED"). Each
 * month starts at the ledger's number, so only a different month is changed.
 * The total per product cannot change here (that is a return or a request).
 */
export function BagExpiryCheck({ requestId }: { requestId?: string }) {
  const stock = useSalesStock()
  const requests = useStockRequests('all')
  const request = requestId ? requests.data?.find((r) => r.id === requestId) : undefined

  if (stock.isPending || (requestId && requests.isPending)) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" aria-busy="true" />
  }
  if (stock.isError) return <ErrorState message={stock.error.message} onRetry={() => stock.refetch()} />

  const fromWarehouse = new Map((request?.items ?? []).map((item) => [item.product.id, item.expiry]))
  const rows = stock.data.data.filter((row) => !request || fromWarehouse.has(row.product.id))

  return <CheckForm rows={rows} fromWarehouse={fromWarehouse} requestId={request?.id} requestNumber={request?.number} />
}

function CheckForm({
  rows,
  fromWarehouse,
  requestId,
  requestNumber,
}: {
  rows: ProductStock[]
  fromWarehouse: Map<string, ExpiryMonth[]>
  requestId?: string
  requestNumber?: string
}) {
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const check = useBagExpiryCheck()
  const [clientUuid] = useState(uuid)
  const [counted, setCounted] = useState<Record<string, Record<string, number>>>({})
  const [adding, setAdding] = useState<Record<string, string>>({})
  const months = useMemo(() => futureMonths(), [])

  const rowsOf = (row: ProductStock): ExpiryMonth[] => {
    const mine = counted[row.product.id]
    const ledger = new Map(row.expiry.map((m) => [m.month, m.qty]))
    const all = new Set([...ledger.keys(), ...Object.keys(mine ?? {})])
    return [...all].sort().map((month) => ({ month, qty: mine?.[month] ?? ledger.get(month) ?? 0 }))
  }
  const set = (row: ProductStock, month: string, qty: number) =>
    setCounted((all) => ({
      ...all,
      [row.product.id]: { ...Object.fromEntries(rowsOf(row).map((m) => [m.month, m.qty])), [month]: qty },
    }))

  const wrong = rows.filter((row) => total(rowsOf(row)) !== row.qty)

  const submit = () =>
    check.mutate(
      {
        client_uuid: clientUuid,
        trigger: requestId ? 'receipt' : 'manual',
        stock_request_id: requestId,
        items: rows.map((row) => ({ product_id: row.product.id, expiry: rowsOf(row).filter((m) => m.qty > 0) })),
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.is_match
              ? 'ED bawaan cocok dengan catatan'
              : `ED bawaan dikoreksi: ${result.corrected_qty} barang pindah ke ED yang benar`,
          )
          void navigate({ to: '/field/today' })
        },
      },
    )

  return (
    <section className="flex flex-col gap-4 pb-40">
      <header className="flex items-start gap-2">
        <Link to="/field/today" className="-ml-2 grid size-12 shrink-0 place-items-center rounded-md" aria-label="Kembali">
          <ChevronLeft className="size-6" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{requestNumber ? 'Cocokkan ED' : 'Cek ED bawaan'}</h1>
          <p className="text-muted-foreground">
            {requestNumber ? `Barang dari gudang ${requestNumber}` : 'Hitung bawaan per ED, ubah hanya yang berbeda.'}
          </p>
        </div>
      </header>

      <p role="note" className="flex items-start gap-2 rounded-md bg-info-soft px-4 py-3 text-info-text">
        <CalendarCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        Lihat tanggal ED di kemasan. Jumlah seluruhnya tetap sama; yang diperbaiki hanya ED-nya.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 shadow-card">Belum membawa barang.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
          {rows.map((row) => {
            const lines = rowsOf(row)
            const sum = total(lines)
            const shown = new Set(lines.map((m) => m.month))
            const came = fromWarehouse.get(row.product.id)
            return (
              <li key={row.product.id} className="flex flex-col gap-2 p-3">
                <p className="text-lg font-semibold">{row.product.name}</p>
                {came && came.length > 0 && (
                  <p className="text-sm text-muted-foreground">Dari gudang: {expirySummary(came)}</p>
                )}
                {lines.map((line) => (
                  <div key={line.month} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-base">{expiryLabel(line.month)}</span>
                    <div className="ml-auto">
                      <NumberStepper
                        id={`bag-${row.product.id}-${line.month}`}
                        label={`${row.product.name} ${expiryLabel(line.month)}`}
                        value={line.qty}
                        initial={row.expiry.find((m) => m.month === line.month)?.qty ?? 0}
                        onChange={(n) => set(row, line.month, n)}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <NativeSelect
                    aria-label={`ED lain ${row.product.name}`}
                    value={adding[row.product.id] ?? ''}
                    onChange={(e) => setAdding((all) => ({ ...all, [row.product.id]: e.target.value }))}
                  >
                    <option value="">ED lain…</option>
                    {months
                      .filter((m) => !shown.has(m))
                      .map((m) => (
                        <option key={m} value={m}>
                          {expiryLabel(m)}
                        </option>
                      ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={!adding[row.product.id]}
                    onClick={() => {
                      set(row, adding[row.product.id], 0)
                      setAdding((all) => ({ ...all, [row.product.id]: '' }))
                    }}
                  >
                    <Plus aria-hidden />
                    Tambah
                  </Button>
                </div>
                <p className={sum === row.qty ? 'text-muted-foreground' : 'flex items-start gap-2 text-danger-text'}>
                  {sum !== row.qty && <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
                  Jumlah {sum} dari {row.qty} {row.product.unit}
                  {sum !== row.qty && ': samakan dengan jumlah yang dibawa'}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 mx-auto flex max-w-xl flex-col gap-2 border-t border-border bg-card p-3">
        {!online && (
          <p className="flex items-center gap-2 text-info-text">
            <CloudOff className="size-5" aria-hidden />
            Cek ED butuh sinyal.
          </p>
        )}
        {check.error && (
          <p role="alert" className="text-danger-text">
            {check.error.message}
          </p>
        )}
        <Button size="cta" disabled={!online || rows.length === 0 || wrong.length > 0 || check.isPending} onClick={submit}>
          {check.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {wrong.length > 0 ? 'Perbaiki jumlah yang merah' : 'Simpan cek ED'}
        </Button>
      </div>
    </section>
  )
}
