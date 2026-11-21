import { CircleAlert, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/client'
import { useProductOptions, useReceiveGoods } from '../api'
import type { GoodsReceipt } from '../types'
import type { Sent } from '@/lib/offline/outbox'

interface Line {
  key: number
  product_id: string
  batch_number: string
  expiry_date: string
  qty: string
}

const emptyLine = (key: number): Line => ({ key, product_id: '', batch_number: '', expiry_date: '', qty: '' })

/** GD-01 / P1 — pick product, type batch and ED, fill the quantity. Several products at once. */
export function GoodsReceiptForm({
  onSaved,
  onCancel,
}: {
  onSaved: (r: Sent<GoodsReceipt>) => void
  onCancel: () => void
}) {
  const products = useProductOptions()
  const receive = useReceiveGoods()
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [receivedDate, setReceivedDate] = useState(today)
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine(1)])
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const serverErrors = receive.error instanceof ApiError ? receive.error.fieldErrors : {}
  const errorFor = (field: string) => localErrors[field] ?? serverErrors[field]?.[0]
  const generalError =
    receive.error && Object.keys(serverErrors).length === 0 ? receive.error.message : serverErrors.items?.[0]

  const update = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const errors: Record<string, string> = {}
    lines.forEach((line, i) => {
      if (!line.product_id) errors[`items.${i}.product_id`] = 'Pilih produk.'
      if (!line.batch_number.trim()) errors[`items.${i}.batch_number`] = 'Nomor batch wajib diisi.'
      if (!line.expiry_date) errors[`items.${i}.expiry_date`] = 'ED wajib diisi.'
      if (!/^\d+$/.test(line.qty) || Number(line.qty) < 1) errors[`items.${i}.qty`] = 'Isi jumlah, paling sedikit 1.'
    })
    setLocalErrors(errors)
    if (Object.keys(errors).length > 0) return

    receive.mutate(
      {
        received_date: receivedDate,
        note,
        items: lines.map((line) => ({
          product_id: line.product_id,
          batch_number: line.batch_number.trim(),
          expiry_date: line.expiry_date,
          qty: Number(line.qty),
        })),
      },
      { onSuccess: onSaved },
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[960px] flex-col gap-5 pb-24 sm:pb-0">
      {generalError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {generalError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="received_date" className="text-base">
            Tanggal masuk (wajib)
          </Label>
          <Input
            id="received_date"
            type="date"
            max={today}
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
          <FieldError id="received_date-error" message={serverErrors.received_date?.[0]} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="receipt-note" className="text-base">
            Catatan
          </Label>
          <Input
            id="receipt-note"
            value={note}
            maxLength={255}
            placeholder="Misalnya: dari produksi shift pagi"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-base font-medium">Barang</legend>
        {lines.map((line, i) => (
          <div
            key={line.key}
            className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[2fr_1fr_1fr_100px_auto] sm:items-start"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`product-${line.key}`}>Produk (wajib)</Label>
              <NativeSelect
                id={`product-${line.key}`}
                value={line.product_id}
                aria-invalid={!!errorFor(`items.${i}.product_id`)}
                onChange={(e) => update(line.key, { product_id: e.target.value })}
              >
                <option value="">Pilih produk</option>
                {products.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </NativeSelect>
              <FieldError id={`product-${line.key}-error`} message={errorFor(`items.${i}.product_id`)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`batch-${line.key}`}>No. batch (wajib)</Label>
              <Input
                id={`batch-${line.key}`}
                value={line.batch_number}
                autoCapitalize="characters"
                className="uppercase"
                aria-invalid={!!errorFor(`items.${i}.batch_number`)}
                onChange={(e) => update(line.key, { batch_number: e.target.value })}
              />
              <FieldError id={`batch-${line.key}-error`} message={errorFor(`items.${i}.batch_number`)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`expiry-${line.key}`}>ED (wajib)</Label>
              <Input
                id={`expiry-${line.key}`}
                type="date"
                min={today}
                value={line.expiry_date}
                aria-invalid={!!errorFor(`items.${i}.expiry_date`)}
                onChange={(e) => update(line.key, { expiry_date: e.target.value })}
              />
              <FieldError id={`expiry-${line.key}-error`} message={errorFor(`items.${i}.expiry_date`)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`qty-${line.key}`}>Jumlah (wajib)</Label>
              <Input
                id={`qty-${line.key}`}
                inputMode="numeric"
                className="tabular-nums"
                value={line.qty}
                aria-invalid={!!errorFor(`items.${i}.qty`)}
                onChange={(e) => update(line.key, { qty: e.target.value.replace(/\D/g, '') })}
              />
              <FieldError id={`qty-${line.key}-error`} message={errorFor(`items.${i}.qty`)} />
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
        ))}
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => setLines((all) => [...all, emptyLine(Math.max(...all.map((l) => l.key)) + 1)])}
        >
          <Plus aria-hidden />
          Tambah produk
        </Button>
      </fieldset>

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-3 border-t border-border bg-card p-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="cta" className="sm:h-10 sm:w-auto" disabled={receive.isPending}>
          {receive.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          Simpan barang masuk
        </Button>
      </div>
    </form>
  )
}
