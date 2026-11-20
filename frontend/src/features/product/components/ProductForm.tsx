import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { useCategories, useSaveProduct } from '../api'
import { type ProductFormInput, productFormSchema } from '../schemas'
import type { Product } from '../types'

interface Props {
  /** Empty = add a new product */
  product?: Product
  onSaved: (product: Product) => void
  onCancel: () => void
}

function defaults(product?: Product): ProductFormInput {
  return {
    code: product?.code ?? '',
    name: product?.name ?? '',
    category_id: product?.category?.id ?? '',
    bpom_number: product?.bpom_number ?? '',
    unit: product?.unit ?? 'pcs',
    selling_price: product ? String(product.selling_price) : '',
    min_stock_qty: product ? String(product.min_stock_qty) : '',
    is_active: product?.is_active ?? true,
    aliases: product?.aliases?.join('\n') ?? '',
  }
}

/** API field names that map to a form field (aliases.0, aliases.1, … → aliases) */
function formField(apiField: string): keyof ProductFormInput {
  return apiField.split('.')[0] as keyof ProductFormInput
}

/** PR-01/PR-02 add or change a product. */
export function ProductForm({ product, onSaved, onCancel }: Props) {
  const categories = useCategories()
  const save = useSaveProduct(product?.id)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults(product),
    mode: 'onTouched',
  })
  const isActive = useWatch({ control, name: 'is_active' })

  const submit = handleSubmit((input) =>
    save.mutate(input, {
      onSuccess: onSaved,
      onError: (error) => {
        if (!(error instanceof ApiError)) return
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const name = formField(field)
          if (name in input) setError(name, { message: messages[0] })
        }
      },
    }),
  )

  const hasFieldErrors = save.error instanceof ApiError && Object.keys(save.error.fieldErrors).length > 0
  const formError = save.error && !hasFieldErrors ? save.error.message : null

  const field = (id: keyof ProductFormInput) => ({
    id,
    'aria-invalid': !!errors[id],
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[720px] flex-col gap-5 pb-24 sm:pb-0">
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code" className="text-base">
            Kode (wajib)
          </Label>
          <Input
            {...field('code')}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="MDK02"
            className="uppercase"
            {...register('code')}
          />
          <FieldError id="code-error" message={errors.code?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-base">
            Nama produk (wajib)
          </Label>
          <Input {...field('name')} autoComplete="off" {...register('name')} />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id" className="text-base">
            Kategori (wajib)
          </Label>
          <NativeSelect {...field('category_id')} {...register('category_id')}>
            <option value="">Pilih kategori</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="category_id-error" message={errors.category_id?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bpom_number" className="text-base">
            Nomor BPOM (wajib)
          </Label>
          <Input {...field('bpom_number')} autoComplete="off" {...register('bpom_number')} />
          <FieldError id="bpom_number-error" message={errors.bpom_number?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="selling_price" className="text-base">
            Harga jual (wajib)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              Rp
            </span>
            <Input
              {...field('selling_price')}
              inputMode="numeric"
              placeholder="60000"
              className="pl-10 tabular-nums"
              {...register('selling_price')}
            />
          </div>
          <FieldError id="selling_price-error" message={errors.selling_price?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unit" className="text-base">
            Satuan (wajib)
          </Label>
          <Input {...field('unit')} autoComplete="off" placeholder="pcs, botol, kotak" {...register('unit')} />
          <FieldError id="unit-error" message={errors.unit?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="min_stock_qty" className="text-base">
            Stok minimum gudang
          </Label>
          <Input {...field('min_stock_qty')} inputMode="numeric" placeholder="0" {...register('min_stock_qty')} />
          <FieldError id="min_stock_qty-error" message={errors.min_stock_qty?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="aliases" className="text-base">
          Nama lain di Excel lama
        </Label>
        <p id="aliases-help" className="text-sm text-muted-foreground">
          Satu nama per baris, misalnya &quot;MADU KELOR 250&quot;. Dipakai untuk mencocokkan data saat impor Excel.
        </p>
        <Textarea
          id="aliases"
          rows={3}
          aria-invalid={!!errors.aliases}
          aria-describedby={errors.aliases ? 'aliases-error' : 'aliases-help'}
          {...register('aliases')}
        />
        <FieldError id="aliases-error" message={errors.aliases?.message} />
      </div>

      {product && (
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            checked={isActive}
            onChange={(event) => setValue('is_active', event.target.checked, { shouldDirty: true })}
          />
          <span>
            Produk aktif
            <span className="block text-sm text-muted-foreground">
              Produk nonaktif tidak muncul di daftar harga dan tidak bisa dijual.
            </span>
          </span>
        </label>
      )}

      <p className="text-sm text-muted-foreground">
        Perubahan harga berlaku untuk transaksi berikutnya. Transaksi yang sudah tercatat tetap memakai harga lama.
      </p>

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-3 border-t border-border bg-card p-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="cta" className="sm:h-10 sm:w-auto" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {product ? 'Simpan perubahan' : 'Simpan produk'}
        </Button>
      </div>
    </form>
  )
}
