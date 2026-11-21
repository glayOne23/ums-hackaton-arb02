import { CircleAlert, LoaderCircle, Scale } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useOutlets } from '@/features/outlet/api'
import type { Transaction, TransactionItemInput } from '@/features/sales/types'
import { ApiError } from '@/lib/api/client'
import { formatTableDate } from '@/lib/format'
import { useCorrectionPreview, useRequestCorrection } from '../api'
import type { Correction, CorrectionInput, CorrectionItemInput } from '../types'

type Field = 'remaining_qty' | 'withdrawn_qty' | 'refill_qty' | 'sold_qty'

const CONSIGNMENT_FIELDS: { key: Field; label: string }[] = [
  { key: 'remaining_qty', label: 'Sisa' },
  { key: 'withdrawn_qty', label: 'Tarik' },
  { key: 'refill_qty', label: 'Isi ulang' },
]
const DIRECT_FIELDS: { key: Field; label: string }[] = [{ key: 'sold_qty', label: 'Beli' }]

interface Props {
  transaction: Transaction
  /** Start from what the phone sent (KR-11 "Pakai data HP") instead of the saved numbers */
  fromPhone?: boolean
  /** Office users may move the nota to another outlet (BPM P10) */
  allowOutletChange?: boolean
  onDone: (correction: Correction) => void
  onCancel: () => void
}

type Values = Record<string, Record<Field, number>>

/**
 * W11: the visit numbers, editable, with the impact the server computes
 * before anything is saved. The creator within the window saves at once;
 * otherwise a reason is required and it may wait for approval.
 */
export function CorrectionForm({
  transaction: t,
  fromPhone = false,
  allowOutletChange = false,
  onDone,
  onCancel,
}: Props) {
  const id = useId()
  const summary = t.correction
  const consignment = t.type.value === 'consignment_visit'
  const fields = consignment ? CONSIGNMENT_FIELDS : DIRECT_FIELDS
  const items = useMemo(() => t.items ?? [], [t.items])

  const initial = useMemo<Values>(() => {
    const values: Values = {}
    for (const item of items) {
      values[item.product_id] = {
        remaining_qty: item.remaining_qty ?? 0,
        withdrawn_qty: item.withdrawn_qty,
        refill_qty: item.refill_qty,
        sold_qty: item.sold_qty,
      }
    }
    return values
  }, [items])
  const [values, setValues] = useState<Values>(() => (fromPhone ? withPhone(initial, t.client_items ?? []) : initial))
  const [outletId, setOutletId] = useState(t.outlet?.id ?? '')
  const [reason, setReason] = useState('')
  const request = useRequestCorrection(t.id)

  const changed =
    outletId !== t.outlet?.id ||
    items.some((item) => fields.some((f) => values[item.product_id]?.[f.key] !== initial[item.product_id]?.[f.key]))
  const input: CorrectionInput = {
    kind: 'correct',
    outlet_id: outletId !== t.outlet?.id ? outletId : null,
    items: items.map((item) => toInput(item.product_id, values[item.product_id], fields)),
  }
  // Ask the server once typing pauses, not on every key
  const settled = useSettled(changed ? input : null)
  const preview = useCorrectionPreview(t.id, settled)
  const reasonRequired = !summary?.direct
  const submitLabel = summary?.direct
    ? 'Simpan perbaikan'
    : summary?.needs_approval
      ? 'Ajukan koreksi'
      : 'Simpan koreksi'

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        request.mutate({ ...input, reason: reason.trim() || undefined }, { onSuccess: onDone })
      }}
    >
      <p className="text-muted-foreground">
        {summary?.direct
          ? `Anda masih bisa memperbaiki nota ini langsung sampai ${formatTableDate(new Date(summary.direct_until))}.`
          : summary?.needs_approval
            ? 'Lewat batas perbaikan langsung: koreksi ini perlu disetujui dulu sebelum berlaku.'
            : 'Koreksi langsung berlaku setelah disimpan.'}{' '}
        Nota lama tidak dihapus; nota pengganti dibuat dengan angka yang benar.
      </p>

      {fromPhone && (
        <p className="rounded-md bg-info-soft px-3 py-2 text-info-text" role="note">
          Angka diisi dari data HP sales. Periksa lagi sebelum menyimpan.
        </p>
      )}

      {allowOutletChange && (
        <OutletPicker id={`${id}-outlet`} transaction={t} value={outletId} onChange={setOutletId} />
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Angka yang benar</legend>
        {items.map((item) => (
          <div
            key={item.product_id}
            role="group"
            aria-label={item.product_name}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <p className="font-medium wrap-break-word">
              {item.product_name}
              {consignment && (
                <span className="block text-sm font-normal text-muted-foreground">
                  Titipan saat kunjungan {item.opening_qty}
                </span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {fields.map((field) => {
                const inputId = `${id}-${item.product_id}-${field.key}`
                const value = values[item.product_id]?.[field.key] ?? 0
                const touched = value !== initial[item.product_id]?.[field.key]
                return (
                  <div key={field.key} className="flex min-w-0 flex-col gap-1">
                    <Label htmlFor={inputId}>{field.label}</Label>
                    <Input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className={touched ? 'border-primary bg-accent font-semibold tabular-nums' : 'tabular-nums'}
                      value={value}
                      aria-describedby={touched ? `${inputId}-was` : undefined}
                      onChange={(e) =>
                        setValues((v) => ({
                          ...v,
                          [item.product_id]: {
                            ...v[item.product_id],
                            [field.key]: Math.max(0, Number(e.target.value) || 0),
                          },
                        }))
                      }
                    />
                    {touched && (
                      <span id={`${inputId}-was`} className="text-sm text-muted-foreground">
                        sebelumnya {initial[item.product_id]?.[field.key]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-reason`}>Alasan{reasonRequired ? ' (wajib)' : ' (boleh kosong)'}</Label>
        <Textarea
          id={`${id}-reason`}
          rows={2}
          placeholder="Misalnya: salah ketik sisa saat kunjungan"
          value={reason}
          required={reasonRequired}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <Impact changed={changed} preview={preview} />

      {request.error && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {request.error.message}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" disabled={!changed || request.isPending || preview.isError}>
          {request.isPending && <LoaderCircle className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function Impact({ changed, preview }: { changed: boolean; preview: ReturnType<typeof useCorrectionPreview> }) {
  if (!changed) {
    return <p className="text-muted-foreground">Ubah angka di atas; dampaknya ke stok dan tagihan muncul di sini.</p>
  }
  if (preview.isError) {
    const message = preview.error instanceof ApiError ? preview.error.message : 'Dampak belum bisa dihitung.'
    return (
      <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        {message}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted p-3" aria-live="polite" aria-busy={preview.isFetching}>
      <p className="flex items-center gap-2 font-semibold">
        <Scale className="size-5" aria-hidden />
        Dampak bila disimpan
        {preview.isFetching && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      </p>
      {preview.data ? (
        preview.data.lines.length === 0 ? (
          <p>Stok dan tagihan tidak berubah.</p>
        ) : (
          <ul className="list-disc pl-6">
            {preview.data.lines.map((line) => (
              <li key={line} className="wrap-break-word">
                {line}
              </li>
            ))}
          </ul>
        )
      ) : (
        <p className="text-muted-foreground">Menghitung…</p>
      )}
    </div>
  )
}

function OutletPicker({
  id,
  transaction,
  value,
  onChange,
}: {
  id: string
  transaction: Transaction
  value: string
  onChange: (id: string) => void
}) {
  const consignment = transaction.type.value === 'consignment_visit'
  const outlets = useOutlets({ status: 'active', per_page: 500, ...(consignment ? { sale_mode: 'consignment' } : {}) })
  const options = (outlets.data?.data ?? []).filter((o) => consignment || o.sale_mode.value !== 'consignment')

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>Outlet</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {transaction.outlet && !options.some((o) => o.id === transaction.outlet?.id) && (
          <option value={transaction.outlet.id}>{transaction.outlet.name}</option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {o.code}
          </option>
        ))}
      </NativeSelect>
      <span className="text-sm text-muted-foreground">
        Pilih outlet lain bila kunjungan tercatat ke outlet yang salah.
      </span>
    </div>
  )
}

function useSettled<T>(value: T, ms = 400): T {
  const key = JSON.stringify(value)
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(JSON.parse(key) as T), ms)
    return () => clearTimeout(timer)
  }, [key, ms])
  return settled
}

function toInput(
  productId: string,
  values: Record<Field, number> | undefined,
  fields: { key: Field }[],
): CorrectionItemInput {
  const item: CorrectionItemInput = { product_id: productId }
  for (const f of fields) item[f.key] = values?.[f.key] ?? 0
  return item
}

/** The phone's numbers, for products the nota has (the server decides the rest). */
function withPhone(initial: Values, phone: TransactionItemInput[]): Values {
  const next: Values = structuredClone(initial)
  for (const item of phone) {
    const row = next[item.product_id]
    if (!row) continue
    if (item.remaining_qty !== undefined) row.remaining_qty = item.remaining_qty
    if (item.withdrawn_qty !== undefined) row.withdrawn_qty = item.withdrawn_qty
    if (item.refill_qty !== undefined) row.refill_qty = item.refill_qty
    if (item.sold_qty !== undefined) row.sold_qty = item.sold_qty
  }
  return next
}
