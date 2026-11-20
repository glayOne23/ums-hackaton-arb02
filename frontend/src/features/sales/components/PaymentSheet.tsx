import { Camera, CircleCheck, Info, LoaderCircle } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { formatCurrency, formatNumber } from '@/lib/format'
import { compressImage } from '@/lib/image'
import { cn } from '@/lib/utils'
import { sumMoney } from '../calc'
import type { PaymentMethodValue } from '../types'

export interface Payment {
  amount: number
  method: PaymentMethodValue
  photo: Blob | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** This visit's bill after discount */
  total: number
  previousUnpaid: number
  /** The billing suggestion line, e.g. "Laku 3 pcs (lebih dari 2): sebaiknya ditagih sekarang" */
  hint: { text: string; collectNow: boolean } | null
  photoRequired: boolean
  onSave: (payment: Payment) => Promise<void>
}

/**
 * M3 — Bayar & simpan (KS-08, KS-10). One tap saves: "Dibayar semua",
 * "Sebagian…", or "Belum bayar". The amount settles earlier unpaid notas
 * first (oldest first), as the server does.
 */
export function PaymentSheet({ open, onOpenChange, total, previousUnpaid, hint, photoRequired, onSave }: Props) {
  const owed = sumMoney([total, previousUnpaid])
  const [method, setMethod] = useState<PaymentMethodValue>('cash')
  const [partial, setPartial] = useState(false)
  const [amount, setAmount] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const preview = usePreview(photo)
  const fileRef = useRef<HTMLInputElement>(null)
  const amountId = useId()

  const partialValue = Number(amount.replace(/\D/g, '') || 0)
  const partialTooHigh = partialValue > owed
  const blocked = saving || (photoRequired && !photo)

  const save = async (paid: number) => {
    setSaving(true)
    try {
      await onSave({ amount: paid, method, photo })
    } finally {
      setSaving(false)
    }
  }

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoError(null)
    try {
      setPhoto(await compressImage(file))
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Foto tidak bisa diproses.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Bayar & simpan</SheetTitle>
        <SheetDescription className="sr-only">Pilih pembayaran untuk menyimpan kunjungan.</SheetDescription>

        <dl className="flex flex-col gap-1 text-lg">
          <div className="flex justify-between gap-3">
            <dt>Tagihan kunjungan ini</dt>
            <dd className="font-semibold tabular-nums">{formatCurrency(total)}</dd>
          </div>
          {previousUnpaid > 0 && (
            <div className="flex justify-between gap-3">
              <dt>Belum dibayar sebelumnya</dt>
              <dd className="tabular-nums">{formatCurrency(previousUnpaid)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-border pt-1">
            <dt className="font-semibold">Total</dt>
            <dd className="text-xl font-bold tabular-nums">{formatCurrency(owed)}</dd>
          </div>
        </dl>

        {hint && (
          <p
            className={cn(
              'flex items-start gap-2 rounded-md px-3 py-2',
              hint.collectNow ? 'bg-warning-soft text-warning-text' : 'bg-muted text-muted-foreground',
            )}
          >
            <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
            {hint.text}
          </p>
        )}

        {owed > 0 && (
          <div className="flex gap-2" role="radiogroup" aria-label="Cara bayar">
            {(['cash', 'transfer'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={method === value}
                onClick={() => setMethod(value)}
                className={cn(
                  'h-12 flex-1 rounded-md border text-base',
                  method === value ? 'border-primary bg-accent font-semibold' : 'border-border bg-card',
                )}
              >
                {value === 'cash' ? 'Tunai' : 'Transfer'}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => void choosePhoto(e.target.files?.[0])}
          />
          <div className="flex items-center gap-3">
            {preview && <img src={preview} alt="Foto form" className="size-16 rounded-md border object-cover" />}
            <Button type="button" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Camera aria-hidden />
              {photo ? 'Ganti foto form' : `Foto form bercap (${photoRequired ? 'wajib' : 'opsional'})`}
            </Button>
          </div>
          {photo && (
            <p className="flex items-center gap-1.5 text-sm text-success-text">
              <CircleCheck className="size-4" aria-hidden />
              Foto siap ({formatNumber(Math.round(photo.size / 1000))} KB)
            </p>
          )}
          {photoError && (
            <p role="alert" className="text-danger-text">
              {photoError}
            </p>
          )}
          {photoRequired && !photo && <p className="text-muted-foreground">Ambil foto form dulu untuk menyimpan.</p>}
        </div>

        {owed === 0 ? (
          <Button size="cta" disabled={blocked} onClick={() => void save(0)}>
            {saving && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Simpan kunjungan
          </Button>
        ) : partial ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={amountId} className="text-base">
              Uang yang dibayar
            </Label>
            <Input
              id={amountId}
              inputMode="numeric"
              autoFocus
              className="h-12 text-xl"
              value={amount ? formatNumber(partialValue) : ''}
              placeholder="0"
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={partialTooHigh}
            />
            {partialTooHigh && (
              <p role="alert" className="text-danger-text">
                Lebih dari total {formatCurrency(owed)}. Pilih "Dibayar semua" bila dibayar penuh.
              </p>
            )}
            <Button
              size="cta"
              disabled={blocked || partialValue <= 0 || partialTooHigh}
              onClick={() => void save(partialValue)}
            >
              {saving && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
              Simpan, dibayar {formatCurrency(partialValue)}
            </Button>
            <Button variant="ghost" onClick={() => setPartial(false)}>
              Kembali
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button size="cta" disabled={blocked} onClick={() => void save(owed)}>
              {saving && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
              Dibayar semua
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" disabled={blocked} onClick={() => setPartial(true)}>
                Sebagian…
              </Button>
              <Button variant="outline" size="lg" disabled={blocked} onClick={() => void save(0)}>
                Belum bayar
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function usePreview(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}
