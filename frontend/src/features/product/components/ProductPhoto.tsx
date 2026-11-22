import { ImageOff, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/image'
import { useProductPhoto, useRemoveProductPhoto, useUploadProductPhoto } from '../api'
import type { Product } from '../types'

/** PR-01: the optional product photo on the product page; product.manage may add, replace, or remove it. */
export function ProductPhoto({ product, canManage }: { product: Product; canManage: boolean }) {
  const photo = useProductPhoto(product.id, product.photo_version)
  const upload = useUploadProductPhoto(product.id)
  const remove = useRemoveProductPhoto(product.id)
  const input = useRef<HTMLInputElement>(null)
  const busy = upload.isPending || remove.isPending

  const choose = async (file: File | undefined) => {
    if (!file) return
    try {
      // Same compression as form photos: small enough for the sales' data plan
      const blob = await compressImage(file, 300_000, 1024)
      upload.mutate(blob, {
        onSuccess: () => toast.success('Foto produk tersimpan'),
        onError: (error) => toast.error(error.message),
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Foto tidak bisa diproses.')
    }
  }

  return (
    <SectionCard title="Foto produk" bodyClassName="sm:flex-row sm:items-start">
      <div className="grid aspect-square w-full max-w-48 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-slate-50">
        {product.has_photo && photo.data ? (
          <img src={photo.data} alt={`Foto ${product.name}`} className="size-full object-contain" />
        ) : product.has_photo && photo.isPending ? (
          <LoaderCircle className="size-8 animate-spin text-slate-500" aria-label="Memuat foto" />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
            Belum ada foto
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground">
          Opsional. Membantu sales dan gudang mengenali kemasan. Foto diperkecil otomatis sebelum dikirim.
        </p>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>
              {upload.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
              {product.has_photo ? 'Ganti foto' : 'Tambah foto'}
            </Button>
            {product.has_photo && (
              <Button
                variant="danger-outline"
                disabled={busy}
                onClick={() =>
                  remove.mutate(undefined, {
                    onSuccess: () => toast.success('Foto produk dihapus'),
                    onError: (error) => toast.error(error.message),
                  })
                }
              >
                <Trash2 aria-hidden />
                Hapus foto
              </Button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
