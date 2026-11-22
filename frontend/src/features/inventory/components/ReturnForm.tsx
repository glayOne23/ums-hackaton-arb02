import { CircleAlert, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useReceiveReturn, useSalesStock, useSalesUsers } from '../api'
import { RETURN_CONDITIONS, type ReturnConditionValue, type StockReturn } from '../types'
import type { Sent } from '@/lib/offline/outbox'

interface Line {
  key: number
  product_id: string
  qty: string
  condition: ReturnConditionValue
}

/** GD-05 / P6 — goods back from a sales; the condition decides where they go (BR-07). */
export function ReturnForm({ onSaved, onCancel }: { onSaved: (r: Sent<StockReturn>) => void; onCancel: () => void }) {
  const salesUsers = useSalesUsers()
  const receive = useReceiveReturn()
  const [salesId, setSalesId] = useState('')
  const carried = useSalesStock(salesId ? Number(salesId) : undefined, salesId !== '')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([{ key: 1, product_id: '', qty: '', condition: 'sellable' }])
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const serverErrors = receive.error instanceof ApiError ? receive.error.fieldErrors : {}
  const errorFor = (field: string) => localErrors[field] ?? serverErrors[field]?.[0]
  const generalError = receive.error && Object.keys(serverErrors).length === 0 ? receive.error.message : null
  const update = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!salesId) errors.sales_user_id = 'Pilih sales yang mengembalikan barang.'
    lines.forEach((line, i) => {
      if (!line.product_id) errors[`items.${i}.product_id`] = 'Pilih produk.'
      if (!/^\d+$/.test(line.qty) || Number(line.qty) < 1) errors[`items.${i}.qty`] = 'Isi jumlah, paling sedikit 1.'
    })
    setLocalErrors(errors)
    if (Object.keys(errors).length > 0) return

    receive.mutate(
      {
        sales_user_id: Number(salesId),
        sales_name: salesUsers.data?.find((u) => String(u.id) === salesId)?.name,
        note,
        items: lines.map((line) => ({ product_id: line.product_id, qty: Number(line.qty), condition: line.condition })),
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[860px] flex-col gap-5 pb-24 sm:pb-0">
      {generalError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {generalError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="return-sales" className="text-base">
          Sales (wajib)
        </Label>
        <NativeSelect
          id="return-sales"
          value={salesId}
          aria-invalid={!!errorFor('sales_user_id')}
          onChange={(e) => {
            setSalesId(e.target.value)
            setLines((all) => all.map((l) => ({ ...l, product_id: '' })))
          }}
        >
          <option value="">Pilih sales</option>
          {salesUsers.data?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </NativeSelect>
        <FieldError id="return-sales-error" message={errorFor('sales_user_id')} />
      </div>

      {salesId && carried.data && (
        <div className="rounded-lg border border-border bg-card shadow-card p-4">
          <p className="mb-2 font-medium">Bawaan {carried.data.sales.name} sekarang</p>
          {carried.data.data.length === 0 ? (
            <p className="text-muted-foreground">Sales ini tidak membawa barang.</p>
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {carried.data.data.map((row) => (
                <li key={row.product.id} className="flex justify-between gap-2">
                  <span>{row.product.name}</span>
                  <span className="tabular-nums">{formatNumber(row.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-3" disabled={!salesId}>
        <legend className="mb-2 text-base font-medium">Barang yang dikembalikan</legend>
        {lines.map((line, i) => (
          <div key={line.key} className="flex flex-col gap-3 rounded-lg border border-border bg-card shadow-card p-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_100px_auto] sm:items-start">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`rproduct-${line.key}`}>Produk (wajib)</Label>
                <NativeSelect
                  id={`rproduct-${line.key}`}
                  value={line.product_id}
                  aria-invalid={!!errorFor(`items.${i}.product_id`)}
                  onChange={(e) => update(line.key, { product_id: e.target.value })}
                >
                  <option value="">{salesId ? 'Pilih produk' : 'Pilih sales dulu'}</option>
                  {carried.data?.data.map((row) => (
                    <option key={row.product.id} value={row.product.id}>
                      {row.product.name} (dibawa {row.qty})
                    </option>
                  ))}
                </NativeSelect>
                <FieldError id={`rproduct-${line.key}-error`} message={errorFor(`items.${i}.product_id`)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`rqty-${line.key}`}>Jumlah (wajib)</Label>
                <Input
                  id={`rqty-${line.key}`}
                  inputMode="numeric"
                  className="tabular-nums"
                  value={line.qty}
                  aria-invalid={!!errorFor(`items.${i}.qty`)}
                  onChange={(e) => update(line.key, { qty: e.target.value.replace(/\D/g, '') })}
                />
                <FieldError id={`rqty-${line.key}-error`} message={errorFor(`items.${i}.qty`)} />
              </div>
              {lines.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:mt-6"
                  aria-label={`Hapus baris ${i + 1}`}
                  onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                >
                  <Trash2 aria-hidden />
                  <span className="sm:hidden">Hapus baris</span>
                </Button>
              )}
            </div>
            <div role="radiogroup" aria-label={`Kondisi baris ${i + 1}`} className="grid grid-cols-3 gap-2">
              {RETURN_CONDITIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-md border px-2 py-1 text-center',
                    'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                    line.condition === option.value ? 'choice-on' : 'choice',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`condition-${line.key}`}
                    value={option.value}
                    checked={line.condition === option.value}
                    onChange={() => update(line.key, { condition: option.value })}
                  />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() =>
            setLines((all) => [
              ...all,
              { key: Math.max(...all.map((l) => l.key)) + 1, product_id: '', qty: '', condition: 'sellable' },
            ])
          }
        >
          <Plus aria-hidden />
          Tambah produk
        </Button>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="return-note" className="text-base">
          Catatan
        </Label>
        <Input id="return-note" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-3 border-t border-border bg-card p-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="cta" className="sm:h-10 sm:w-auto" disabled={receive.isPending}>
          {receive.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          Simpan retur
        </Button>
      </div>
    </form>
  )
}
