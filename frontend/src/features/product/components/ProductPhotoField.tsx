import { ImageOff, ImagePlus, LoaderCircle, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { compressImage } from '@/lib/image'
import { type PhotoChange, useProductPhoto } from '../api'
import type { Product } from '../types'

/**
 * PR-01: optional photo inside the product form. The photo is compressed on
 * the device (≤ 300 KB) and sent after the product is saved.
 * photo: Blob = new photo chosen, null = remove the current one, undefined = keep.
 */
export function PhotoField({
  product,
  photo,
  onChange,
}: {
  product?: Product
  photo: PhotoChange
  onChange: (photo: PhotoChange) => void
}) {
  const current = useProductPhoto(product?.id ?? '', product?.has_photo ? product.photo_version : null)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Preview of the newly chosen photo; freed when it changes or the form closes
  const preview = useMemo(() => (photo instanceof Blob ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const choose = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      onChange(await compressImage(file, 300_000, 1024))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto tidak bisa diproses. Coba foto lain.')
    } finally {
      setBusy(false)
    }
  }

  const hasCurrent = Boolean(product?.has_photo) && photo !== null
  const shown = preview ?? (hasCurrent && photo === undefined ? current.data : undefined)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="product-photo" className="text-base">
        Foto produk (opsional)
      </Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid aspect-square w-full max-w-40 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-slate-50">
          {busy || (hasCurrent && photo === undefined && current.isPending) ? (
            <LoaderCircle className="size-8 animate-spin text-slate-500" aria-label="Memuat foto" />
          ) : shown ? (
            <img src={shown} alt="Pratinjau foto produk" className="size-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
              <ImageOff className="size-8" aria-hidden />
              {photo === null ? 'Foto akan dihapus' : 'Belum ada foto'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p id="product-photo-help" className="text-sm text-muted-foreground">
            Membantu sales dan gudang mengenali kemasan. Foto diperkecil otomatis sebelum dikirim.
          </p>
          <input
            ref={input}
            id="product-photo"
            type="file"
            accept="image/*"
            className="sr-only"
            aria-describedby="product-photo-help"
            onChange={(e) => {
              void choose(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              <ImagePlus aria-hidden />
              {shown ? 'Ganti foto' : 'Pilih foto'}
            </Button>
            {photo instanceof Blob && (
              <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>
                <Undo2 aria-hidden />
                Batalkan pilihan
              </Button>
            )}
            {photo === undefined && hasCurrent && (
              <Button type="button" variant="danger-outline" onClick={() => onChange(null)}>
                <Trash2 aria-hidden />
                Hapus foto
              </Button>
            )}
            {photo === null && (
              <Button type="button" variant="ghost" onClick={() => onChange(undefined)}>
                <Undo2 aria-hidden />
                Jangan hapus
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger-text">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
